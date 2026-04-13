const jwt = require('jsonwebtoken');
const { User, PFSM } = require('../database/models');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, grade, subjects } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: role || 'student',
      grade,
      subjects: subjects || []
    });

    // Initialize PFSM for students
    if (user.role === 'student') {
      await PFSM.create({ studentId: user.id });
    }

    const token = generateToken(user.id);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        grade: user.grade,
        subjects: user.subjects || []
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log(`Login attempt failed: User not found for email: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log(`Login attempt failed: Invalid password for email: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    const token = generateToken(user.id);

    console.log(`Login successful: ${user.email} (${user.role})`);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        grade: user.grade,
        subjects: user.subjects || []
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

exports.getMe = async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role,
        grade: req.user.grade,
        subjects: req.user.subjects || [],
        avatar: req.user.avatar
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

