const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  caption: {
    type: String
  },
  mediaUrl: {
    type: String
  },
  mediaType: {
    type: String
  },
  location: {
    type: String
  },
  emotion: {
    type: String
  },
  moodScore: {
    type: Number
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isFlagged: {
    type: Boolean,
    default: false
  },
  embedding: {
    type: [Number],
    required: false
  }
}, {
  timestamps: true
});

// For Atlas Vector Search validation (though index is managed in Atlas UI)
// PostSchema.index({ embedding: "2dsphere" }); 
// Note: MongoDB Atlas Vector search requires standard [Number] types

module.exports = mongoose.model('Post', PostSchema);
