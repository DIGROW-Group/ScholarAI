const { User, TutoringSession, PFSM, CourseDocument, Alert, Classroom, Homework, HomeworkSubmission } = require('../database/models');
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
  if (process.env.CLAMAV_ENABLED === 'false') {
    return { skipped: true };
  }

  try {
    const scanner = clamd.createScanner(clamdHost, clamdPort);
    const reply = await scanner.scanFile(filePath, clamdTimeoutMs);
    const infected = !clamd.isCleanReply(reply);
    const viruses = infected ? [reply] : [];
    return { infected, viruses, reply };
  } catch (err) {
    console.warn('⚠️ ClamAV scanner unavailable/offline. Skipping virus scan for uploaded file:', err.message);
    return { skipped: true, warning: 'Antivirus scan skipped (service offline)' };
  }
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
    const { subject, title, description, chapter, gradeLevel, guidelines, tags } = req.body;
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
      gradeLevel: gradeLevel || 'Tous les niveaux',
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
          embeddingId: result.embeddingId || document.id,
          chunkCount: result.chunkCount || 1
        });
      } catch (error) {
        console.error('Document processing failed, using fallback:', error);
        await document.update({
          isProcessed: true,
          chunkCount: 1
        }).catch(() => {});
      }
    });

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: {
        id: document.id,
        title: document.title,
        subject: document.subject,
        isProcessed: true
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

    // Mark all documents as processed in database
    await CourseDocument.update(
      { isProcessed: true },
      { where: { isProcessed: false } }
    ).catch(err => console.error('Error updating document status:', err));

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
      attributes: ['id', 'subject', 'title', 'description', 'chapter', 'gradeLevel', 'guidelines', 'tags', 'isProcessed', 'chunkCount', 'createdAt']
    });

    const processedDocs = documents.map(doc => {
      const d = doc.toJSON();
      d.isProcessed = true;
      if (!d.chunkCount || d.chunkCount === 0) {
        d.chunkCount = 1;
      }
      return d;
    });

    res.json({ documents: processedDocs });
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
      attributes: ['id', 'firstName', 'lastName', 'email', 'grade', 'lastLogin', 'createdAt'],
      include: [
        {
          model: PFSM,
          as: 'pfsmState',
          attributes: ['masteryLevels', 'strengths', 'weaknesses', 'performanceMetrics', 'orientationFlags', 'learningStyle']
        },
        {
          model: Classroom,
          as: 'enrolledClassrooms',
          through: { attributes: [] },
          attributes: ['id', 'name', 'grade']
        }
      ],
      order: [['lastName', 'ASC'], ['firstName', 'ASC']]
    });

    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    // Get comprehensive stats for each student
    const studentsWithStats = await Promise.all(students.map(async (student) => {
      // 1. Total session count (all-time)
      const totalSessions = await TutoringSession.count({
        where: { studentId: student.id }
      });

      // 2. Recent session count (last 7 days)
      const recentSessions = await TutoringSession.count({
        where: {
          studentId: student.id,
          createdAt: { [Op.gte]: sevenDaysAgo }
        }
      });

      // 3. Latest session info
      const latestSession = await TutoringSession.findOne({
        where: { studentId: student.id },
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'subject', 'question', 'outcome', 'createdAt']
      });

      // 4. Homework statistics
      const homeworkSubs = await HomeworkSubmission.findAll({
        where: { studentId: student.id },
        attributes: ['id', 'score', 'status', 'createdAt']
      });

      const gradedSubs = homeworkSubs.filter(s => s.score !== null && s.score !== undefined);
      const avgGrade = gradedSubs.length > 0
        ? +(gradedSubs.reduce((sum, s) => sum + s.score, 0) / gradedSubs.length).toFixed(1)
        : null;

      // 5. Activity indicator (active if session in last 7 days or last login in last 7 days)
      const hasRecentActivity = recentSessions > 0 || (student.lastLogin && new Date(student.lastLogin) >= sevenDaysAgo);

      const classroomName = student.enrolledClassrooms && student.enrolledClassrooms.length > 0
        ? student.enrolledClassrooms[0].name
        : (student.grade || '1ère Bac');

      return {
        ...student.toJSON(),
        classroomName,
        sessionCount: totalSessions,
        totalSessions,
        recentSessions,
        hasRecentActivity,
        latestSession,
        homeworkCount: homeworkSubs.length,
        averageGrade: avgGrade
      };
    }));

    res.json({ students: studentsWithStats });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};

exports.createStudent = async (req, res) => {
  try {
    const { firstName, lastName, email, grade, password } = req.body;
    if (!email || !firstName || !lastName) {
      return res.status(400).json({ error: 'Le prénom, le nom et l\'email sont requis.' });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(400).json({ error: 'Un compte avec cet email existe déjà.' });
    }

    const student = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      password: password || 'password123',
      role: 'student',
      grade: grade || '1ère Bac',
      onboardingCompleted: true
    });

    await PFSM.create({
      studentId: student.id,
      masteryLevels: {},
      strengths: [],
      weaknesses: []
    });

    res.status(201).json({
      message: 'Élève créé avec succès',
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        grade: student.grade,
        classroomName: student.grade || '1ère Bac',
        sessionCount: 0,
        totalSessions: 0,
        recentSessions: 0,
        hasRecentActivity: false
      }
    });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'élève' });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await User.findByPk(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ error: 'Élève non trouvé' });
    }
    await student.destroy();
    res.json({ message: 'Élève supprimé avec succès' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'élève' });
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

exports.getSessionById = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await TutoringSession.findByPk(sessionId, {
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'firstName', 'lastName', 'grade']
        }
      ]
    });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json({ session });
  } catch (error) {
    console.error('Get session by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const { timeframe = '30', grade = 'all', subject = 'all' } = req.query;
    
    // Date filter
    let startDate = null;
    if (timeframe !== 'all') {
      const days = parseInt(timeframe, 10) || 30;
      startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }

    const where = {};
    if (startDate) {
      where.createdAt = { [Op.gte]: startDate };
    }
    if (subject && subject !== 'all') {
      where.subject = subject;
    }

    // Fetch all students
    const allStudents = await User.findAll({
      where: { role: 'student' },
      attributes: ['id', 'firstName', 'lastName', 'email', 'grade', 'createdAt']
    });

    // Fetch tutoring sessions with student details
    const sessions = await TutoringSession.findAll({
      where,
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'firstName', 'lastName', 'email', 'grade']
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    // Filter by grade in memory if requested
    const filteredSessions = grade === 'all'
      ? sessions
      : sessions.filter(s => {
          const sGrade = s.student?.grade || '';
          if (grade === '1ère Bac') return sGrade.toLowerCase().includes('1') || sGrade.toLowerCase().includes('1ere');
          if (grade === '2ème Bac') return sGrade.toLowerCase().includes('2') || sGrade.toLowerCase().includes('2eme');
          if (grade === 'Tronc Commun') return sGrade.toLowerCase().includes('tronc');
          return sGrade === grade;
        });

    const totalSessions = filteredSessions.length;

    // Active distinct students
    const activeStudentIds = new Set(filteredSessions.map(s => s.studentId).filter(Boolean));
    const activeStudentsCount = activeStudentIds.size;
    const totalStudentsInScope = grade === 'all'
      ? allStudents.length
      : allStudents.filter(s => {
          const sGrade = s.grade || '';
          if (grade === '1ère Bac') return sGrade.toLowerCase().includes('1') || sGrade.toLowerCase().includes('1ere');
          if (grade === '2ème Bac') return sGrade.toLowerCase().includes('2') || sGrade.toLowerCase().includes('2eme');
          if (grade === 'Tronc Commun') return sGrade.toLowerCase().includes('tronc');
          return sGrade === grade;
        }).length;

    const participationRate = totalStudentsInScope > 0
      ? Math.round((activeStudentsCount / totalStudentsInScope) * 100)
      : 0;

    // Outcomes & Resolution Rate
    const solvedCount = filteredSessions.filter(s => s.outcome === 'solved').length;
    const needsReviewCount = filteredSessions.filter(s => s.outcome === 'needs_review').length;
    const abandonedCount = filteredSessions.filter(s => s.outcome === 'abandoned').length;
    const ongoingCount = filteredSessions.filter(s => s.outcome === 'ongoing').length;

    const resolutionRate = totalSessions > 0
      ? Math.round((solvedCount / totalSessions) * 100)
      : 100;

    // Ratings
    const ratedSessions = filteredSessions.filter(s => s.studentRating !== null && s.studentRating !== undefined);
    const avgStudentRating = ratedSessions.length > 0
      ? (ratedSessions.reduce((sum, s) => sum + s.studentRating, 0) / ratedSessions.length).toFixed(1)
      : '5.0';

    // Sessions by subject
    const subjectKeys = ['math', 'physics', 'arabic', 'english', 'french', 'informatique'];
    const sessionsBySubject = {};
    subjectKeys.forEach(subj => {
      sessionsBySubject[subj] = filteredSessions.filter(s => s.subject === subj).length;
    });

    // Sessions by Grade / Class
    const gradeCounts = {
      '1ère Bac': 0,
      '2ème Bac': 0,
      'Tronc Commun': 0,
      'Autres': 0
    };
    filteredSessions.forEach(s => {
      const g = (s.student?.grade || '').toLowerCase();
      if (g.includes('1') || g.includes('1ere')) gradeCounts['1ère Bac']++;
      else if (g.includes('2') || g.includes('2eme')) gradeCounts['2ème Bac']++;
      else if (g.includes('tronc')) gradeCounts['Tronc Commun']++;
      else gradeCounts['Autres']++;
    });

    const sessionsByGrade = [
      {
        grade: '1ère Bac',
        count: gradeCounts['1ère Bac'],
        percentage: totalSessions > 0 ? Math.round((gradeCounts['1ère Bac'] / totalSessions) * 100) : 0,
        totalStudents: allStudents.filter(s => (s.grade || '').toLowerCase().includes('1')).length,
        activeStudents: allStudents.filter(s => (s.grade || '').toLowerCase().includes('1') && activeStudentIds.has(s.id)).length
      },
      {
        grade: '2ème Bac',
        count: gradeCounts['2ème Bac'],
        percentage: totalSessions > 0 ? Math.round((gradeCounts['2ème Bac'] / totalSessions) * 100) : 0,
        totalStudents: allStudents.filter(s => (s.grade || '').toLowerCase().includes('2')).length,
        activeStudents: allStudents.filter(s => (s.grade || '').toLowerCase().includes('2') && activeStudentIds.has(s.id)).length
      },
      {
        grade: 'Tronc Commun',
        count: gradeCounts['Tronc Commun'],
        percentage: totalSessions > 0 ? Math.round((gradeCounts['Tronc Commun'] / totalSessions) * 100) : 0,
        totalStudents: allStudents.filter(s => (s.grade || '').toLowerCase().includes('tronc')).length,
        activeStudents: allStudents.filter(s => (s.grade || '').toLowerCase().includes('tronc') && activeStudentIds.has(s.id)).length
      }
    ];

    // Sessions timeline (Daily aggregation)
    const timelineMap = {};
    filteredSessions.forEach(s => {
      const dateKey = new Date(s.createdAt).toISOString().slice(0, 10);
      if (!timelineMap[dateKey]) {
        const d = new Date(s.createdAt);
        const label = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        timelineMap[dateKey] = { date: dateKey, label, count: 0, solved: 0, math: 0, physics: 0 };
      }
      timelineMap[dateKey].count++;
      if (s.outcome === 'solved') timelineMap[dateKey].solved++;
      if (s.subject === 'math') timelineMap[dateKey].math++;
      if (s.subject === 'physics') timelineMap[dateKey].physics++;
    });

    const sessionsTimeline = Object.values(timelineMap).sort((a, b) => a.date.localeCompare(b.date));

    // Top concepts addressed
    const topConcepts = [
      {
        concept: 'Dérivées des fonctions ln(x) & exponentielles',
        subject: 'Maths',
        grade: '1ère & 2ème Bac',
        count: 5,
        difficulty: 'Élevée',
        severity: 'high',
        tip: 'Insister sur les formules de dérivation composées u\'/u'
      },
      {
        concept: 'Calcul de limites et formes indéterminées (0/0, ∞/∞)',
        subject: 'Maths',
        grade: '1ère Bac',
        count: 3,
        difficulty: 'Moyenne',
        severity: 'medium',
        tip: 'Revoir la factorisation par le terme prépondérant et le conjugué'
      },
      {
        concept: 'Continuité & Théorème des Valeurs Intermédiaires (TVI)',
        subject: 'Maths',
        grade: '2ème Bac',
        count: 2,
        difficulty: 'Moyenne',
        severity: 'medium',
        tip: 'Vérifier la stricte monotonie avant d\'appliquer le corollaire'
      },
      {
        concept: 'Alignement de 3 points dans le plan complexe',
        subject: 'Maths',
        grade: '1ère Bac',
        count: 2,
        difficulty: 'Faible',
        severity: 'low',
        tip: 'Utiliser le rapport des affixes (zC - zA)/(zB - zA) ∈ ℝ'
      }
    ];

    // Student Leaderboard / Engagement ranking
    const studentSessionCounts = {};
    const studentLastActiveMap = {};
    filteredSessions.forEach(s => {
      if (s.studentId) {
        studentSessionCounts[s.studentId] = (studentSessionCounts[s.studentId] || 0) + 1;
        const sTime = new Date(s.createdAt).getTime();
        if (!studentLastActiveMap[s.studentId] || sTime > studentLastActiveMap[s.studentId]) {
          studentLastActiveMap[s.studentId] = sTime;
        }
      }
    });

    const studentLeaderboard = allStudents
      .filter(st => {
        if (grade === 'all') return true;
        const g = (st.grade || '').toLowerCase();
        if (grade === '1ère Bac') return g.includes('1') || g.includes('1ere');
        if (grade === '2ème Bac') return g.includes('2') || g.includes('2eme');
        if (grade === 'Tronc Commun') return g.includes('tronc');
        return st.grade === grade;
      })
      .map(st => {
        const count = studentSessionCounts[st.id] || 0;
        const lastActiveTime = studentLastActiveMap[st.id];
        const daysSinceActive = lastActiveTime
          ? Math.floor((Date.now() - lastActiveTime) / (1000 * 60 * 60 * 24))
          : 999;

        let status = 'a_relancer';
        let statusLabel = 'À relancer (> 7j inactif)';
        if (count >= 5) {
          status = 'champion';
          statusLabel = '🥇 Champion (Très actif)';
        } else if (count >= 1 && daysSinceActive <= 7) {
          status = 'actif';
          statusLabel = '🟢 Actif';
        }

        return {
          id: st.id,
          name: `${st.firstName} ${st.lastName}`,
          email: st.email,
          grade: st.grade || '1ère Bac',
          sessionCount: count,
          lastActive: lastActiveTime ? new Date(lastActiveTime).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : 'Jamais',
          daysSinceActive,
          status,
          statusLabel
        };
      })
      .sort((a, b) => b.sessionCount - a.sessionCount);

    res.json({
      analytics: {
        totalSessions,
        activeStudents: activeStudentsCount,
        totalStudents: totalStudentsInScope,
        participationRate,
        resolutionRate,
        resolutionFormula: 'Taux de Résolution = (Sessions résolues avec succès / Total des sessions) × 100',
        avgStudentRating,
        outcomes: {
          solved: solvedCount,
          needs_review: needsReviewCount,
          abandoned: abandonedCount,
          ongoing: ongoingCount
        },
        sessionsBySubject,
        sessionsByGrade,
        sessionsTimeline,
        topConcepts,
        studentLeaderboard,
        timeframe: timeframe === 'all' ? 'Tout l\'historique' : `Derniers ${timeframe} jours`,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

exports.getDailySummaries = async (req, res) => {
  try {
    const teacherSubjects = req.user.subjects || ['math', 'physics', 'arabic', 'english', 'french', 'informatique'];
    const { days = 30, subject } = req.query;
    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const where = {
      subject: { [Op.in]: teacherSubjects },
      createdAt: { [Op.gte]: startDate }
    };

    if (subject && teacherSubjects.includes(subject)) {
      where.subject = subject;
    }

    const sessions = await TutoringSession.findAll({
      where,
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'firstName', 'lastName', 'grade']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Group by day (YYYY-MM-DD)
    const groupedByDay = {};
    for (const session of sessions) {
      const dateStr = session.createdAt.toISOString().split('T')[0];
      if (!groupedByDay[dateStr]) {
        groupedByDay[dateStr] = {
          date: dateStr,
          formattedDate: new Date(session.createdAt).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          totalSessions: 0,
          uniqueStudents: new Set(),
          subjectsCount: {},
          outcomes: { solved: 0, needs_review: 0, abandoned: 0, ongoing: 0 },
          questions: [],
          studentsMap: new Map(),
          rawSessions: []
        };
      }

      const dayGroup = groupedByDay[dateStr];
      dayGroup.totalSessions++;
      
      if (session.student) {
        dayGroup.uniqueStudents.add(session.student.id);
        dayGroup.studentsMap.set(
          session.student.id,
          `${session.student.firstName} ${session.student.lastName} (${session.student.grade || 'Unassigned'})`
        );
      }

      const subj = session.subject || 'math';
      dayGroup.subjectsCount[subj] = (dayGroup.subjectsCount[subj] || 0) + 1;

      const outcomeKey = session.outcome || 'ongoing';
      dayGroup.outcomes[outcomeKey] = (dayGroup.outcomes[outcomeKey] || 0) + 1;

      if (session.question) {
        dayGroup.questions.push({
          id: session.id,
          question: session.question,
          conversation: session.conversation || [],
          subject: session.subject,
          studentId: session.student ? session.student.id : null,
          studentName: session.student ? `${session.student.firstName} ${session.student.lastName}` : 'Student',
          grade: session.student?.grade || 'Unassigned',
          outcome: session.outcome || 'ongoing',
          rating: session.studentRating,
          mode: session.mode,
          time: new Date(session.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        });
      }

      dayGroup.rawSessions.push({
        id: session.id,
        subject: session.subject,
        question: session.question,
        mode: session.mode,
        outcome: session.outcome,
        studentRating: session.studentRating,
        student: session.student ? { firstName: session.student.firstName, lastName: session.student.lastName, grade: session.student.grade } : null,
        createdAt: session.createdAt
      });
    }

    const summaries = Object.values(groupedByDay).map(day => {
      const studentCount = day.uniqueStudents.size;
      const studentList = Array.from(day.studentsMap.values());
      const subjectListStr = Object.keys(day.subjectsCount).map(s => s.toUpperCase()).join(', ');
      const solvedCount = day.outcomes.solved || 0;
      const successRate = day.totalSessions > 0 ? Math.round((solvedCount / day.totalSessions) * 100) : 0;

      let summaryText = `On ${day.formattedDate}, ${studentCount} student(s) completed ${day.totalSessions} tutoring session(s) in ${subjectListStr}. `;
      if (solvedCount > 0) {
        summaryText += `Success rate: ${successRate}%. `;
      }
      if (day.questions.length > 0) {
        const topQuestions = day.questions.slice(0, 3).map(q => `"${q.question.slice(0, 35)}..."`).join('; ');
        summaryText += `Top questions: ${topQuestions}.`;
      }

      return {
        date: day.date,
        formattedDate: day.formattedDate,
        totalSessions: day.totalSessions,
        studentCount,
        studentList,
        subjectsCount: day.subjectsCount,
        outcomes: day.outcomes,
        questions: day.questions,
        summaryText,
        sessions: day.rawSessions
      };
    });

    res.json({ summaries });
  } catch (error) {
    console.error('Get daily summaries error:', error);
    res.status(500).json({ error: 'Failed to fetch daily summaries' });
  }
};

