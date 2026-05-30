const { User, PFSM, RefreshToken } = require('../database/models');
const {
  hashToken,
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
  clearTokenCookies,
  REFRESH_TOKEN_MAX_AGE_MS
} = require('../utils/tokenUtils');

const serializeUser = (user) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
  grade: user.grade,
  subjects: user.subjects || [],
  onboardingCompleted: user.onboardingCompleted,
  avatar: user.avatar
});

const persistRefreshToken = async (userId, refreshToken) => {
  await RefreshToken.create({
    token: hashToken(refreshToken),
    userId,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS)
  });
};

exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, grade, subjects } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.toLowerCase() : email;
    const allowedSelfServiceRoles = new Set(['student', 'parent']);
    const normalizedRole = role || 'student';

    if (!allowedSelfServiceRoles.has(normalizedRole)) {
      return res.status(400).json({
        error: 'Role is invalid',
        details: ['Self-service registration is limited to student and parent accounts']
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create user
    const user = await User.create({
      email: normalizedEmail,
      password,
      firstName,
      lastName,
      role: normalizedRole,
      grade,
      subjects: subjects || []
    });

    // Initialize PFSM for students
    if (user.role === 'student') {
      await PFSM.create({ studentId: user.id });
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken();
    await persistRefreshToken(user.id, refreshToken);
    setTokenCookies(res, accessToken, refreshToken);

    res.status(201).json({
      user: serializeUser(user)
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.toLowerCase() : email;

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      console.log(`Login attempt failed: User not found for email: ${normalizedEmail}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log(`Login attempt failed: Invalid password for email: ${normalizedEmail}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken();
    await persistRefreshToken(user.id, refreshToken);
    setTokenCookies(res, accessToken, refreshToken);

    console.log(`Login successful: ${user.email} (${user.role})`);

    res.json({
      user: serializeUser(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

exports.getMe = async (req, res) => {
  try {
    res.json({
      user: serializeUser(req.user)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

exports.refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token missing' });
    }

    const tokenRecord = await RefreshToken.findOne({
      where: { token: hashToken(refreshToken) },
      include: [{ model: User, as: 'user' }]
    });

    if (!tokenRecord || !tokenRecord.user) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    if (new Date(tokenRecord.expiresAt) < new Date()) {
      await tokenRecord.destroy();
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    await tokenRecord.destroy();

    const nextRefreshToken = generateRefreshToken();
    await persistRefreshToken(tokenRecord.user.id, nextRefreshToken);

    const accessToken = generateAccessToken(tokenRecord.user.id, tokenRecord.user.role);
    setTokenCookies(res, accessToken, nextRefreshToken);

    return res.json({ user: serializeUser(tokenRecord.user) });
  } catch (error) {
    console.error('Refresh error:', error);
    return res.status(500).json({ error: 'Token refresh failed' });
  }
};

exports.logout = async (req, res) => {
  try {
    await RefreshToken.destroy({ where: { userId: req.user.id } });
    clearTokenCookies(res);
    return res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    clearTokenCookies(res);
    return res.status(500).json({ error: 'Logout failed' });
  }
};

exports.completeOnboarding = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.update({ onboardingCompleted: true });

    res.json({ success: true });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
};

