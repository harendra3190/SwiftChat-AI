// src/utils/response.js — Standardized API response helpers
const { StatusCodes } = require('http-status-codes');

/**
 * Send a success response
 */
const sendSuccess = (res, data = {}, message = 'Success', statusCode = StatusCodes.OK) => {
  return res.status(statusCode).json({ success: true, message, data });
};

/**
 * Send an error response
 */
const sendError = (res, statusCode = StatusCodes.INTERNAL_SERVER_ERROR, message = 'An error occurred') => {
  return res.status(statusCode).json({ success: false, message });
};

/**
 * Send paginated response
 */
const sendPaginated = (res, data, pagination, message = 'Success') => {
  return res.status(StatusCodes.OK).json({
    success: true,
    message,
    data,
    pagination,
  });
};

module.exports = { sendSuccess, sendError, sendPaginated };
