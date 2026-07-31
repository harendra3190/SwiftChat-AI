// src/utils/jwt.js — JWT token helpers
const jwt = require('jsonwebtoken');

const generateAccessToken = (userId, role = 'user') => {
  return jwt.sign(
    { sub: userId, role },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { sub: userId },
    process.env.JWT_REFRESH_SECRET || 'fallback_refresh',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'fallback_refresh');
};

module.exports = { generateAccessToken, generateRefreshToken, verifyRefreshToken };
