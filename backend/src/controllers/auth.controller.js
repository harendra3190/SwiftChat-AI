// src/controllers/auth.controller.js
const {
  registerUser,
  loginUser,
  getMeProfile,
  refreshTokenService,
  logoutUser,
  forgotPasswordService,
  resetPasswordService,
} = require("../services/auth.service");
const { StatusCodes } = require("http-status-codes");
const { sendSuccess } = require("../utils/response");

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const result = await registerUser(req.body);
    sendSuccess(res, result, "Registration successful", StatusCodes.CREATED);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const result = await loginUser(req.body);
    sendSuccess(res, result, "Login successful");
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await getMeProfile(req.user.id);
    sendSuccess(res, { user }, "User profile fetched");
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/refresh
const refreshToken = async (req, res, next) => {
  try {
    const result = await refreshTokenService(req.body.refreshToken);
    sendSuccess(res, result, "Token refreshed");
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    const accessToken = req.headers.authorization?.split(" ")[1];
    const result = await logoutUser({
      refreshToken: req.body.refreshToken,
      accessToken,
    });
    sendSuccess(res, result, "Logged out successfully");
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const result = await forgotPasswordService(req.body.email);
    if (result.registered === false) {
      return res.status(404).json({ success: false, message: result.message, registered: false });
    }
    sendSuccess(res, result, result.message, StatusCodes.OK);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const result = await resetPasswordService(
      req.body.token,
      req.body.password,
    );
    sendSuccess(res, result, result.message);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  getMe,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
};
