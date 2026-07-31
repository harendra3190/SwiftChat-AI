// src/models/Report.model.js
const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
  },
  reason: {
    type: String,
    enum: ['spam', 'harassment', 'misinformation', 'inappropriate', 'other'],
    default: 'other',
  },
  details: {
    type: String,
    maxlength: 500,
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'dismissed'],
    default: 'pending',
  },
}, { timestamps: true });

// Prevent duplicate reports from the same user for the same post
ReportSchema.index({ reporter: 1, post: 1 }, { unique: true });

module.exports = mongoose.model('Report', ReportSchema);
