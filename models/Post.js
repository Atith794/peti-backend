// src/models/Post.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, 'Comment cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

const postSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  caption: {
    type: String,
    trim: true,
    maxlength: [2200, 'Caption cannot exceed 2200 characters']
  },
  mediaUrl: {
    type: String,
    required: [true, 'Media URL is required']
  },
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    required: true
  },
  audioUrl: {
    type: String,
    trim: true,
    default: null
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [commentSchema],
  location: {
    type: String,
    trim: true
  },
  hashtags: [{
    type: String,
    trim: true
  }],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Index for better search performance
postSchema.index({ user: 1, createdAt: -1 });
postSchema.index({ hashtags: 1 });

// Virtual field for like count
postSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual field for comment count
postSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Middleware to process hashtags and mentions before saving
postSchema.pre('save', function(next) {
  if (this.isModified('caption')) {
    // Extract hashtags
    const hashtagRegex = /#[\w]+/g;
    this.hashtags = this.caption.match(hashtagRegex) || [];
    
    // Clean hashtags (remove #)
    this.hashtags = this.hashtags.map(tag => tag.slice(1));
  }
  next();
});

// Method to check if a user has liked the post
postSchema.methods.isLikedBy = function(userId) {
  return this.likes.includes(userId);
};

// Method to toggle like status
postSchema.methods.toggleLike = async function(userId) {
  const isLiked = this.isLikedBy(userId);
  if (isLiked) {
    this.likes = this.likes.filter(id => !id.equals(userId));
  } else {
    this.likes.push(userId);
  }
  return this.save();
};

const Post = mongoose.model('Post', postSchema);

module.exports = Post;