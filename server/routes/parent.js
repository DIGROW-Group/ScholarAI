const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');
const { auth, roleAuth } = require('../middleware/auth');

router.get('/children', auth, roleAuth('parent'), parentController.getChildren);
router.post('/children/link', auth, roleAuth('parent'), parentController.linkChild);
router.get('/child/:studentId/overview', auth, roleAuth('parent'), parentController.getChildOverview);
router.get('/child/:studentId/attendance', auth, roleAuth('parent'), parentController.getChildAttendance);
router.get('/child/:studentId/alerts', auth, roleAuth('parent'), parentController.getChildAlerts);

module.exports = router;

