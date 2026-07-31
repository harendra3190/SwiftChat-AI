// src/middleware/errorHandler.js — Global error handling middleware
const { StatusCodes } = require('http-status-codes');
const logger = require('../config/logger');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  let { statusCode = StatusCodes.INTERNAL_SERVER_ERROR, message } = err;

  // Prisma unique constraint
  if (err.code === 'P2002') {
    statusCode = StatusCodes.CONFLICT;
    message = `${err.meta?.target?.join(', ')} already exists`;
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    statusCode = StatusCodes.NOT_FOUND;
    message = 'Record not found';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = StatusCodes.UNAUTHORIZED;
    message = 'Invalid token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = StatusCodes.UNAUTHORIZED;
    message = 'Token expired';
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    statusCode = StatusCodes.UNPROCESSABLE_ENTITY;
    message = err.message;
  }

  if (statusCode >= 500) {
    logger.error({
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, StatusCodes.NOT_FOUND));
};

module.exports = { errorHandler, notFound, AppError };
