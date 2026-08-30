const express = require('express');
const router = express.Router();
const tutorController = require('../controllers/tutorController');
const { auth, roleAuth } = require('../middleware/auth');

router.post('/ask', auth, roleAuth('student'), tutorController.askQuestion);
router.post('/feedback', auth, roleAuth('student'), tutorController.submitFeedback);
router.get('/sessions', auth, roleAuth('student'), tutorController.getSessions);
router.get('/session/:sessionId', auth, roleAuth('student'), tutorController.getSession);
router.get('/sessions/:sessionId', auth, roleAuth('student'), tutorController.getSession);
router.delete('/session/:sessionId', auth, roleAuth('student'), tutorController.deleteSession);

module.exports = router;

