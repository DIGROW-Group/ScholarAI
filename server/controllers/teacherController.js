const { User, TutoringSession, PFSM, CourseDocument, Alert } = require('../database/models');
const { Op } = require('sequelize');
const RAGService = require('../services/RAGService');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const clamd = require('clamdjs');

const clamdEnabled = process.env.CLAMAV_ENABLED !== 'false';
const clamdHost = process.env.CLAMD_HOST || 'clamd';
const clamdPort = parseInt(process.env.CLAMD_PORT, 10) || 3310;
const clamdTimeoutMs = parseInt(process.env.CLAMD_TIMEOUT_MS, 10) || 60000;

const scanUpload = async (filePath) => {
  if (!clamdEnabled) {
    return { skipped: true };
  }

  const scanner = clamd.createScanner(clamdHost, clamdPort);
  const reply = await scanner.scanFile(filePath, clamdTimeoutMs);
  const infected = !clamd.isCleanReply(reply);
  const viruses = infected ? [reply] : [];

  return { infected, viruses, reply };
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedExts = new Set(['.pdf', '.txt', '.doc', '.docx']);
    const allowedMimes = new Set([
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]);
    const extname = path.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype;

    if (allowedExts.has(extname) && allowedMimes.has(mimetype)) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, TXT, DOC files are allowed'));
    }
  }
});

exports.uploadMiddleware = upload.single('document');

exports.uploadDocument = async (req, res) => {
  try {
    const { subject, title, description, chapter, guidelines, tags } = req.body;
    const teacherId = req.user.id;
    const teacherSubjects = req.user.subjects || [];

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const scanResult = await scanUpload(req.file.path);
      if (scanResult.infected) {
        await fs.unlink(req.file.path).catch(() => undefined);
        return res.status(422).json({ error: 'File rejected by antivirus scan', details: scanResult.viruses });
      }
    } catch (scanError) {
      console.error('Antivirus scan failed:', scanError);
      await fs.unlink(req.file.path).catch(() => undefined);
      return res.status(503).json({ error: 'Antivirus service unavailable' });
    }

    // Check if teacher is authorized for this subject
    if (!teacherSubjects.includes(subject)) {
      return res.status(403).json({ error: 'You are not authorized to upload content for this subject' });
    }

    // Create document record
    const document = await CourseDocument.create({
      teacherId,
      subject,
      title,
      description,
      chapter,
      guidelines,
      tags: tags ? JSON.parse(tags) : [],
      filePath: req.file.path,
      fileType: req.file.mimetype
    });

    // Process document for RAG asynchronously
    setImmediate(async () => {
      try {
        const result = await RAGService.processDocument(
          req.file.path,
          subject,
          document.id,
          {
            title,
            chapter,
            uploadedBy: teacherId
          }
        );

        await document.update({
          isProcessed: true,
          embeddingId: result.embeddingId,
          chunkCount: result.chunkCount
        });
      } catch (error) {
        console.error('Document processing failed:', error);
      }
    });

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: {
        id: document.id,
        title: document.title,
        subject: document.subject,
        isProcessed: false
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const teacherSubjects = req.user.subjects || [];
    const { subject } = req.query;

    const where = { 
      teacherId,
      subject: { [require('sequelize').Op.in]: teacherSubjects }
    };
    
    if (subject && teacherSubjects.includes(subject)) {
      where.subject = subject;
    }

    const documents = await CourseDocument.findAll({
      where,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'subject', 'title', 'description', 'chapter', 'guidelines', 'tags', 'isProcessed', 'chunkCount', 'createdAt']
    });

    res.json({ documents });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
};

exports.getSessionsBySubject = async (req, res) => {
  try {
    const { subject } = req.params;
    const { limit = 50 } = req.query;
    const teacherSubjects = req.user.subjects || [];

    const validSubjects = ['math', 'physics', 'arabic', 'english', 'french', 'informatique'];
    if (!validSubjects.includes(subject)) {
      return res.status(400).json({ error: 'Invalid subject' });
    }

    // Check if teacher is authorized for this subject
    if (!teacherSubjects.includes(subject)) {
      return res.status(403).json({ error: 'You are not authorized to view this subject' });
    }

    const sessions = await TutoringSession.findAll({
      where: { subject },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'firstName', 'lastName', 'grade']
        }
      ]
    });

    res.json({ sessions });
  } catch (error) {
    console.error('Get sessions by subject error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const teacherId = req.user.id;

    const document = await CourseDocument.findOne({
      where: { id: documentId, teacherId }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete from vector store
    await RAGService.deleteDocument(document.subject, document.id);

    // Delete file
    await fs.unlink(document.filePath).catch(err => console.error('File deletion error:', err));

    // Delete record
    await document.destroy();

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const students = await User.findAll({
      where: { role: 'student' },
      attributes: ['id', 'firstName', 'lastName', 'email', 'grade', 'lastLogin'],
      include: [
        {
          model: PFSM,
          as: 'pfsmState',
          attributes: ['masteryLevels', 'strengths', 'weaknesses', 'performanceMetrics', 'orientationFlags']
        }
      ],
      order: [['lastName', 'ASC'], ['firstName', 'ASC']]
    });

    // Get recent session counts for each student
    const studentsWithStats = await Promise.all(students.map(async (student) => {
      const sessionCount = await TutoringSession.count({
        where: {
          studentId: student.id,
          createdAt: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      });

      return {
        ...student.toJSON(),
        recentSessions: sessionCount
      };
    }));

    res.json({ students: studentsWithStats });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};

exports.getStudentSessions = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { subject, limit = 50 } = req.query;
    const teacherSubjects = req.user.subjects || [];

    const where = { 
      studentId,
      subject: { [require('sequelize').Op.in]: teacherSubjects }
    };
    
    if (subject && teacherSubjects.includes(subject)) {
      where.subject = subject;
    }

    const sessions = await TutoringSession.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['firstName', 'lastName']
        }
      ]
    });

    res.json({ sessions });
  } catch (error) {
    console.error('Get student sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};

exports.evaluateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { rating, feedback } = req.body;

    const session = await TutoringSession.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await session.update({
      teacherRating: rating,
      teacherFeedback: feedback
    });

    // Recalculate reward with teacher feedback
    const tutorController = require('./tutorController');
    await tutorController.calculateReward(sessionId);

    res.json({ message: 'Evaluation submitted successfully' });
  } catch (error) {
    console.error('Evaluate session error:', error);
    res.status(500).json({ error: 'Failed to evaluate session' });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const { timeframe = '30' } = req.query;
    const days = parseInt(timeframe);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Total sessions
    const totalSessions = await TutoringSession.count({
      where: { createdAt: { [Op.gte]: startDate } }
    });

    // Sessions by subject
    const mathSessions = await TutoringSession.count({
      where: { subject: 'math', createdAt: { [Op.gte]: startDate } }
    });
    const physicsSessions = await TutoringSession.count({
      where: { subject: 'physics', createdAt: { [Op.gte]: startDate } }
    });

    // Average ratings
    const sessions = await TutoringSession.findAll({
      where: {
        createdAt: { [Op.gte]: startDate },
        studentRating: { [Op.ne]: null }
      },
      attributes: ['studentRating', 'outcome', 'subject']
    });

    const avgStudentRating = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + s.studentRating, 0) / sessions.length
      : 0;

    // Outcomes distribution
    const outcomes = {
      solved: await TutoringSession.count({
        where: { outcome: 'solved', createdAt: { [Op.gte]: startDate } }
      }),
      needs_review: await TutoringSession.count({
        where: { outcome: 'needs_review', createdAt: { [Op.gte]: startDate } }
      }),
      abandoned: await TutoringSession.count({
        where: { outcome: 'abandoned', createdAt: { [Op.gte]: startDate } }
      })
    };

    // Most common topics (from recent sessions)
    const recentQuestions = await TutoringSession.findAll({
      where: { createdAt: { [Op.gte]: startDate } },
      attributes: ['question', 'subject'],
      limit: 100
    });

    res.json({
      analytics: {
        totalSessions,
        sessionsBySubject: {
          math: mathSessions,
          physics: physicsSessions
        },
        avgStudentRating: avgStudentRating.toFixed(2),
        outcomes,
        timeframe: `Last ${days} days`
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

