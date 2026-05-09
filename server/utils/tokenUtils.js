const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateAccessToken(userId, role) {
  return jwt.sign(
    { sub: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function setTokenCookies(res, accessToken, refreshToken) {
  const base = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res.cookie('access_token', accessToken, {
    ...base,
    maxAge: ACCESS_TOKEN_MAX_AGE_MS
  });

  res.cookie('refresh_token', refreshToken, {
    ...base,
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    path: '/api/auth/refresh'
  });
}

function clearTokenCookies(res) {
  const base = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res.cookie('access_token', '', { ...base, maxAge: 0 });
  res.cookie('refresh_token', '', { ...base, maxAge: 0, path: '/api/auth/refresh' });
}

module.exports = {
  hashToken,
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
  clearTokenCookies,
  ACCESS_TOKEN_MAX_AGE_MS,
  REFRESH_TOKEN_MAX_AGE_MS
};
