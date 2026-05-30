const jwt = require('jsonwebtoken');
const { User } = require('../database/models');

const auth = async (req, res, next) => {
  try {
    const token = req.cookies?.access_token;

    if (!token) {
      return res.status(401).json({ code: 'INVALID_TOKEN', error: 'Please authenticate' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.sub);

    if (!user) {
      return res.status(401).json({ code: 'INVALID_TOKEN', error: 'Please authenticate' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ code: 'TOKEN_EXPIRED', error: 'Token expired' });
    }
    return res.status(401).json({ code: 'INVALID_TOKEN', error: 'Please authenticate' });
  }
};

const roleAuth = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Please authenticate' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  };
};

module.exports = { auth, roleAuth };

