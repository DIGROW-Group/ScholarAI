const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth, roleAuth } = require('../middleware/auth');

// Admin-only routes
router.get('/teachers', auth, roleAuth('admin'), adminController.getTeachers);
router.post('/staff', auth, roleAuth('admin'), adminController.createStaffUser);
router.patch('/teachers/:teacherId/subjects', auth, roleAuth('admin'), adminController.updateTeacherSubjects);
router.get('/users', auth, roleAuth('admin'), adminController.getAllUsers);

// Classroom management
router.post('/classrooms', auth, roleAuth('admin'), adminController.createClassroom);
router.get('/classrooms', auth, roleAuth('admin'), adminController.getClassrooms);
router.post('/classrooms/:classroomId/students', auth, roleAuth('admin'), adminController.addStudentToClassroom);
router.delete('/classrooms/:classroomId/students/:studentId', auth, roleAuth('admin'), adminController.removeStudentFromClassroom);
router.get('/classrooms/:classroomId/available-students', auth, roleAuth('admin'), adminController.getStudentsNotInClassroom);

module.exports = router;

