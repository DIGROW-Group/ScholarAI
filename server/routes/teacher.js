const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { auth, roleAuth } = require('../middleware/auth');

// Document management
router.post('/documents', auth, roleAuth('teacher', 'admin'), teacherController.uploadMiddleware, teacherController.uploadDocument);
router.get('/documents', auth, roleAuth('teacher', 'admin'), teacherController.getDocuments);
router.delete('/documents/:documentId', auth, roleAuth('teacher', 'admin'), teacherController.deleteDocument);

// Student monitoring & management
router.get('/students', auth, roleAuth('teacher', 'admin'), teacherController.getStudents);
router.post('/students', auth, roleAuth('teacher', 'admin'), teacherController.createStudent);
router.delete('/students/:studentId', auth, roleAuth('teacher', 'admin'), teacherController.deleteStudent);
router.get('/students/:studentId/sessions', auth, roleAuth('teacher', 'admin'), teacherController.getStudentSessions);
router.get('/sessions/subject/:subject', auth, roleAuth('teacher', 'admin'), teacherController.getSessionsBySubject);
router.get('/sessions/:sessionId', auth, roleAuth('teacher', 'admin'), teacherController.getSessionById);
router.post('/sessions/:sessionId/evaluate', auth, roleAuth('teacher', 'admin'), teacherController.evaluateSession);

// Analytics
router.get('/analytics', auth, roleAuth('teacher', 'admin'), teacherController.getAnalytics);
router.get('/daily-summaries', auth, roleAuth('teacher', 'admin'), teacherController.getDailySummaries);

module.exports = router;

