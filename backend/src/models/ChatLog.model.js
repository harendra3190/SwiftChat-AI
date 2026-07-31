// src/models/ChatLog.model.js — Mongoose model for chat history
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const chatLogSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true },
    messages: [messageSchema],
    context: { type: String },
  },
  { timestamps: true }
);

chatLogSchema.index({ userId: 1, createdAt: -1 });

const ChatLog = mongoose.model('ChatLog', chatLogSchema);
module.exports = ChatLog;
