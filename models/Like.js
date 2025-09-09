// src/models/Like.js
const mongoose = require('mongoose');

const LikeSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

// Prevent duplicate likes for the same (post,user)
LikeSchema.index({ postId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Like', LikeSchema);
