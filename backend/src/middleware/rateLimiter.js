// src/middleware/rateLimiter.js — Redis-backed rate limiting
const rateLimit = require('express-rate-limit');
const { StatusCodes } = require('http-status-codes');

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 min
const max = parseInt(process.env.RATE_LIMIT_MAX) || 100;

const rateLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
  statusCode: StatusCodes.TOO_MANY_REQUESTS,
  skip: (req) => req.path === '/api/health',
});

// Stricter limiter for auth endpoints
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many auth attempts. Please try again in 15 minutes.',
  },
  statusCode: StatusCodes.TOO_MANY_REQUESTS,
});

module.exports = { rateLimiter, authRateLimiter };
