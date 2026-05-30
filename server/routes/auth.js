const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validators');

const loginLimiter = rateLimit({
	windowMs: (parseInt(process.env.AUTH_LOGIN_WINDOW_MS, 10) || 15) * 60 * 1000,
	max: parseInt(process.env.AUTH_LOGIN_MAX_ATTEMPTS, 10) || 10,
	standardHeaders: true,
	legacyHeaders: false,
	skipSuccessfulRequests: true,
	keyGenerator: (req) => {
		const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : 'unknown';
		return `${req.ip}:${email}`;
	}
});

router.post('/register', validateRegister, authController.register);
router.post('/login', loginLimiter, validateLogin, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', auth, authController.logout);
router.get('/me', auth, authController.getMe);
router.post('/onboarding-complete', auth, authController.completeOnboarding);

module.exports = router;

