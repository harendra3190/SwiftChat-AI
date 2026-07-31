// src/middleware/auth.middleware.js — JWT authentication guard
const passport = require('passport');
const { StatusCodes } = require('http-status-codes');
const { sendError } = require('../utils/response');

/**
 * Protect routes — requires valid JWT
 */
const protect = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (err) return next(err);
    if (!user) {
      return sendError(res, StatusCodes.UNAUTHORIZED, 'Access denied. Please log in.');
    }
    req.user = user;
    return next();
  })(req, res, next);
};

/**
 * Role-based access control
 * @param {...string} roles - Allowed roles (e.g. 'admin', 'user')
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return sendError(res, StatusCodes.UNAUTHORIZED, 'Not authenticated');
  }
  if (!roles.includes(req.user.role)) {
    return sendError(res, StatusCodes.FORBIDDEN, 'Insufficient permissions');
  }
  return next();
};

module.exports = { protect, authorize };
