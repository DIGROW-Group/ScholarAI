const express = require('express');
const router = express.Router();
const { auth, roleAuth } = require('../middleware/auth');
const counselorController = require('../controllers/counselorController');

// All routes require authentication and counselor role
router.use(auth);
router.use(roleAuth('counselor'));

// Get all students
router.get('/students', counselorController.getAllStudents);

// Get student details with full data
router.get('/students/:studentId', counselorController.getStudentDetails);

// Get orientation agent data for a student
router.get('/students/:studentId/orientation', counselorController.getOrientationData);

// Trigger orientation agent analysis
router.post('/students/:studentId/orientation/analyze', counselorController.triggerOrientationAnalysis);

// Get student sessions (optionally filtered by subject)
router.get('/students/:studentId/sessions', counselorController.getStudentSessions);

// Get student attendance
router.get('/students/:studentId/attendance', counselorController.getStudentAttendance);

// Get all orientation alerts
router.get('/alerts/orientation', counselorController.getAllOrientationAlerts);

// Get all classrooms with students
router.get('/classrooms', counselorController.getClassrooms);

// Run analysis for all students
router.post('/students/analyze-all', counselorController.runAnalysisForAllStudents);

module.exports = router;

