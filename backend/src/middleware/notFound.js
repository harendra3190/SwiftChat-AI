// src/middleware/notFound.js
const { AppError } = require('./errorHandler');

const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

module.exports = { notFound };
