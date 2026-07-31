const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { StatusCodes } = require("http-status-codes");
const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
const Post = require("../models/Post.model");
const Follow = require("../models/Follow.model");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt");
const { AppError } = require("../middleware/errorHandler");
const { redisClient } = require("../config/redis");
const {
  sendEmail,
  buildResetPasswordEmail,
} = require("../utils/email.service");

const registerUser = async ({ username, email, password, displayName }) => {
  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    throw new AppError(
      "Email or username already in use",
      StatusCodes.CONFLICT,
    );
  }

  const user = await User.create({
    username,
    email,
    password,
    displayName: displayName || username,
  });

  const safeUser = {
    id: user._id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt,
  };

  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  return { user: safeUser, accessToken, refreshToken };
};

const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user || !user.passwordHash) {
    throw new AppError("Invalid credentials", StatusCodes.UNAUTHORIZED);
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError("Invalid credentials", StatusCodes.UNAUTHORIZED);
  }

  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  const safeUser = {
    id: user._id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    emotionVibe: user.emotionVibe,
  };

  return { user: safeUser, accessToken, refreshToken };
};

const getMeProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);

  const [postsCount, followersCount, followingCount] = await Promise.all([
    Post.countDocuments({ user: userId }),
    Follow.countDocuments({ following: userId }),
    Follow.countDocuments({ follower: userId }),
  ]);

  return {
    id: user._id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    role: user.role,
    emotionVibe: user.emotionVibe,
    createdAt: user.createdAt,
    _count: {
      posts: postsCount,
      followers: followersCount,
      following: followingCount,
    },
  };
};

const refreshTokenService = async (token) => {
  if (!token)
    throw new AppError("Refresh token required", StatusCodes.BAD_REQUEST);

  const payload = verifyRefreshToken(token);
  const user = await User.findById(payload.sub);
  if (!user) throw new AppError("User not found", StatusCodes.UNAUTHORIZED);

  const accessToken = generateAccessToken(user._id, user.role);
  const newRefreshToken = generateRefreshToken(user._id);

  return { accessToken, refreshToken: newRefreshToken };
};

const logoutUser = async ({ refreshToken, accessToken }) => {
  const addToBlacklist = async (token) => {
    if (!token) return;
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
        if (expiresIn > 0) {
          await redisClient.set(
            `bl_token:${token}`,
            "blacklisted",
            "EX",
            expiresIn,
          );
        }
      }
    } catch (err) {
      console.warn("Failed to parse token for blacklisting:", err.message);
    }
  };

  await Promise.all([
    addToBlacklist(accessToken),
    addToBlacklist(refreshToken),
  ]);
  return {};
};

const forgotPasswordService = async (email) => {
  const user = await User.findOne({ email }).select("+passwordHash");

  if (!user) {
    return {
      registered: false,
      message: "No account found with this email. Please sign up first.",
    };
  }

  // Generate a raw token and its hashed counterpart
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  // 10-minute expiry
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  // Build the reset URL and send the styled email
  const resetUrl = `${process.env.CLIENT_ORIGIN}/reset-password?token=${rawToken}`;
  const html = buildResetPasswordEmail(resetUrl);

  try {
    await sendEmail({
      to: user.email,
      subject: "⚡ Re-sync Your Neural Link — SwiftChat",
      html,
    });
  } catch (err) {
    // If email fails, clear the token so the user can retry
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    throw new AppError(
      "Email transmission failed. Please try again later.",
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }

  return { registered: true, message: "If that email exists, a reset link has been dispatched." };
};

const resetPasswordService = async (rawToken, newPassword) => {
  if (!rawToken)
    throw new AppError("Reset token is required", StatusCodes.BAD_REQUEST);
  if (!newPassword || newPassword.length < 8)
    throw new AppError(
      "Password must be at least 8 characters",
      StatusCodes.BAD_REQUEST,
    );

  // Hash the incoming raw token and find the matching user
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() }, // Token must not be expired
  });

  if (!user) {
    throw new AppError(
      "Invalid or expired reset token. Please request a new Neural Link.",
      StatusCodes.BAD_REQUEST,
    );
  }

  // Update the password - let Mongoose hook do the hashing
  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  return {
    message:
      "Neural Link re-synced. You may now log in with your new password.",
  };
};

module.exports = {
  registerUser,
  loginUser,
  getMeProfile,
  refreshTokenService,
  logoutUser,
  forgotPasswordService,
  resetPasswordService,
};
