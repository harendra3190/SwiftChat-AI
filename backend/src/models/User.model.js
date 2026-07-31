const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
    },
    password: {
      type: String,
      select: false,
    },

    displayName: {
      type: String,
    },
    bio: {
      type: String,
    },
    avatarUrl: {
      type: String,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    provider: {
      type: String,
      default: "local",
    },
    providerId: {
      type: String,
    },
    emotionVibe: {
      type: String,
    },
    resetPasswordToken: {
      type: String,
      default: undefined,
    },
    resetPasswordExpire: {
      type: Date,
      default: undefined,
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    settings: {
      isPrivate: { type: Boolean, default: false },
      notifications: { type: Boolean, default: true },
      aiInsights: { type: Boolean, default: true },
    },
    isPrivate: { type: Boolean, default: false }, // Top-level for easy query
  },
  {
    timestamps: true,
  },
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const bcrypt = require("bcryptjs");
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.password, salt);
    this.password = undefined; // Don't persist plain text
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("User", UserSchema);
