const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { CourseDocument, Homework, User } = require('../database/models');
const { auth } = require('../middleware/auth');
const RAGService = require('../services/RAGService');

function resolveCourseFilePath(rawPath) {
  if (!rawPath) return null;
  // 1. Direct check
  if (fs.existsSync(rawPath)) return path.resolve(rawPath);
  
  // 2. Windows path running under WSL/Linux (e.g. C:\Users\... or C:/Users/...)
  if (process.platform === 'linux' && /^[a-zA-Z]:[\\/]/.test(rawPath)) {
    const withoutDrive = rawPath.replace(/^[a-zA-Z]:[\\/]/, '').replace(/\\/g, '/');
    const wslPath = path.posix.join('/mnt/c', withoutDrive);
    if (fs.existsSync(wslPath)) return wslPath;
  }

  // 3. WSL/Linux path running under Windows (e.g. /mnt/c/Users/...)
  if (process.platform === 'win32' && rawPath.startsWith('/mnt/c/')) {
    const winPath = 'C:\\' + rawPath.replace('/mnt/c/', '').replace(/\//g, '\\');
    if (fs.existsSync(winPath)) return winPath;
  }

  // 4. Filename lookup inside project uploads/ directory
  const filename = path.basename(rawPath);
  const uploadsDir1 = path.resolve(__dirname, '../../uploads', filename);
  if (fs.existsSync(uploadsDir1)) return uploadsDir1;
  const uploadsDir2 = path.resolve(__dirname, '../uploads', filename);
  if (fs.existsSync(uploadsDir2)) return uploadsDir2;
  const uploadsDir3 = path.resolve(process.cwd(), 'uploads', filename);
  if (fs.existsSync(uploadsDir3)) return uploadsDir3;

  return null;
}

// Get list of all available course documents & homeworks for students
router.get('/list', auth, async (req, res) => {
  try {
    const { subject } = req.query;
    const subjLower = (subject && subject !== 'all') ? subject.toLowerCase() : null;

    const docWhere = {};
    if (subjLower) {
      docWhere.subject = subjLower;
    }

    const documents = await CourseDocument.findAll({
      where: docWhere,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'title', 'subject', 'chapter', 'description', 'gradeLevel', 'fileType', 'createdAt']
    });

    const formattedDocs = documents.map(d => ({
      id: d.id,
      title: d.title,
      subject: d.subject,
      chapter: d.chapter || d.title,
      description: d.description,
      gradeLevel: d.gradeLevel,
      type: 'document'
    }));

    res.json({ documents: formattedDocs });
  } catch (err) {
    console.error('Error fetching documents list:', err);
    res.status(500).json({ error: 'Erreur lors du chargement des cours' });
  }
});

// Get document details by ID or title
router.get('/:documentId', auth, async (req, res) => {
  try {
    const rawParam = req.params.documentId;
    const decodedParam = decodeURIComponent(rawParam);
    let doc = await CourseDocument.findByPk(rawParam).catch(() => null);

    if (!doc) {
      doc = await CourseDocument.findByPk(decodedParam).catch(() => null);
    }

    if (!doc) {
      doc = await CourseDocument.findOne({
        where: {
          title: { [require('sequelize').Op.iLike]: `%${decodedParam}%` }
        }
      });
    }

    if (!doc) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    let teacherName = 'Professeur';
    if (doc.teacherId) {
      const teacher = await User.findByPk(doc.teacherId);
      if (teacher) teacherName = `${teacher.firstName} ${teacher.lastName}`;
    }

    const resolvedPath = resolveCourseFilePath(doc.filePath);
    const isPdf = resolvedPath ? resolvedPath.toLowerCase().endsWith('.pdf') : (doc.filePath ? doc.filePath.toLowerCase().endsWith('.pdf') : false);

    // Extract text preview
    let contentSnippet = doc.description || '';
    if (resolvedPath) {
      const fullText = await RAGService.extractTextFromFile(resolvedPath).catch(() => '');
      if (fullText) contentSnippet = fullText.substring(0, 3000);
    }

    res.json({
      document: {
        id: doc.id,
        title: doc.title,
        subject: doc.subject,
        chapter: doc.chapter,
        description: doc.description,
        gradeLevel: doc.gradeLevel,
        fileType: doc.fileType,
        isPdf,
        fileUrl: `/api/documents/${doc.id}/file`,
        teacherName,
        contentSnippet,
        createdAt: doc.createdAt
      }
    });
  } catch (err) {
    console.error('Error fetching document:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération du document' });
  }
});

// Stream raw file for PDF viewer iframe or text viewer
router.get('/:documentId/file', async (req, res) => {
  try {
    const rawParam = req.params.documentId;
    const decodedParam = decodeURIComponent(rawParam);
    let doc = await CourseDocument.findByPk(rawParam).catch(() => null);

    if (!doc) {
      doc = await CourseDocument.findByPk(decodedParam).catch(() => null);
    }

    if (!doc) {
      doc = await CourseDocument.findOne({
        where: {
          title: { [require('sequelize').Op.iLike]: `%${decodedParam}%` }
        }
      });
    }

    if (!doc) {
      return res.status(404).send('Document non trouvé');
    }

    const resolvedPath = resolveCourseFilePath(doc.filePath);
    if (resolvedPath) {
      const ext = path.extname(resolvedPath).toLowerCase();
      let contentType = 'application/octet-stream';
      if (ext === '.pdf' || doc.fileType === 'application/pdf') {
        contentType = 'application/pdf';
      } else if (ext === '.txt') {
        contentType = 'text/plain; charset=utf-8';
      }
      res.setHeader('Content-Type', contentType);
      return res.sendFile(resolvedPath);
    }

    // Fallback text response
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(doc.description || 'Support de cours officiel');
  } catch (err) {
    console.error('Error serving document file:', err);
    res.status(500).send('Erreur lors de la lecture du fichier');
  }
});

// Download document file by ID or title
router.get('/:documentId/download', async (req, res) => {
  try {
    const rawParam = req.params.documentId;
    const decodedParam = decodeURIComponent(rawParam);
    let doc = await CourseDocument.findByPk(rawParam).catch(() => null);

    if (!doc) {
      doc = await CourseDocument.findByPk(decodedParam).catch(() => null);
    }

    if (!doc) {
      doc = await CourseDocument.findOne({
        where: {
          title: { [require('sequelize').Op.iLike]: `%${decodedParam}%` }
        }
      });
    }

    if (!doc) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    const safeTitle = (doc.title || 'Support_de_cours').replace(/[^a-zA-Z0-9_\-]/g, '_');

    // If file exists on disk, download original file (PDF or TXT) directly
    const resolvedPath = resolveCourseFilePath(doc.filePath);
    if (resolvedPath) {
      const ext = path.extname(resolvedPath) || (doc.fileType === 'application/pdf' ? '.pdf' : '.txt');
      return res.download(resolvedPath, `${safeTitle}${ext}`);
    }

    // Fallback generated TXT content
    const content = `================================================================================
SCHOLARAI - SUPPORT DE COURS OFFICIEL
================================================================================
Titre: ${doc.title}
Matière: ${doc.subject ? doc.subject.toUpperCase() : ''}
Chapitre: ${doc.chapter || 'Général'}
Niveau: ${doc.gradeLevel || '1ère Bac / 2ème Bac'}
================================================================================

DESCRIPTION DU SUPPORT:
${doc.description || 'Support de cours officiel déposé par le professeur.'}

CONSIGNES PÉDAGOGIQUES DU PROFESSEUR:
${doc.guidelines || 'Aucune consigne spécifique.'}

================================================================================
ScholarAI RAG Curriculum Document
`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.txt"`);
    return res.send(content);
  } catch (err) {
    console.error('Error downloading document:', err);
    res.status(500).json({ error: 'Erreur lors du téléchargement' });
  }
});

module.exports = router;
