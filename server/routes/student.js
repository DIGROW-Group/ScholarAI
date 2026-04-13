const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { auth, roleAuth } = require('../middleware/auth');

router.get('/progress', auth, roleAuth('student'), studentController.getProgress);
router.get('/orientation', auth, roleAuth('student'), studentController.getOrientationSuggestions);
router.post('/checkin', auth, roleAuth('student'), studentController.checkIn);
router.post('/checkout', auth, roleAuth('student'), studentController.checkOut);
router.get('/attendance', auth, roleAuth('student'), studentController.getAttendance);
router.get('/alerts', auth, roleAuth('student'), studentController.getAlerts);
router.patch('/alerts/:alertId/read', auth, roleAuth('student'), studentController.markAlertRead);

module.exports = router;

