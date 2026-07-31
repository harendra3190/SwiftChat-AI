const mongoose = require('mongoose');

const directMessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  read: { type: Boolean, default: false }
}, { timestamps: true });

directMessageSchema.index({ senderId: 1, receiverId: 1 });

module.exports = mongoose.model('DirectMessage', directMessageSchema);
