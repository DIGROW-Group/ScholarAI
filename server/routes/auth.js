const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', auth, authController.logout);
router.get('/me', auth, authController.getMe);
router.post('/onboarding-complete', auth, authController.completeOnboarding);

module.exports = router;

