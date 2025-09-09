// // src/models/Post.js
// const mongoose = require('mongoose');

// const commentSchema = new mongoose.Schema({
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   text: {
//     type: String,
//     required: true,
//     trim: true,
//     maxlength: [500, 'Comment cannot exceed 500 characters']
//   }
// }, {
//   timestamps: true
// });

// const postSchema = new mongoose.Schema({
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   caption: {
//     type: String,
//     trim: true,
//     maxlength: [2200, 'Caption cannot exceed 2200 characters']
//   },
//   mediaUrl: {
//     type: String,
//     required: [true, 'Media URL is required']
//   },
//   mediaType: {
//     type: String,
//     enum: ['image', 'video'],
//     required: true
//   },
//   audioUrl: {
//     type: String,
//     trim: true,
//     default: null
//   },
//   likes: [{
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   }],
//   comments: [commentSchema],
//   location: {
//     type: String,
//     trim: true
//   },
//   hashtags: [{
//     type: String,
//     trim: true
//   }],
//   mentions: [{
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   }]
// }, {
//   timestamps: true
// });

// // Index for better search performance
// postSchema.index({ user: 1, createdAt: -1 });
// postSchema.index({ hashtags: 1 });

// // Virtual field for like count
// postSchema.virtual('likeCount').get(function() {
//   return this.likes.length;
// });

// // Virtual field for comment count
// postSchema.virtual('commentCount').get(function() {
//   return this.comments.length;
// });

// // Middleware to process hashtags and mentions before saving
// postSchema.pre('save', function(next) {
//   if (this.isModified('caption')) {
//     // Extract hashtags
//     const hashtagRegex = /#[\w]+/g;
//     this.hashtags = this.caption.match(hashtagRegex) || [];
    
//     // Clean hashtags (remove #)
//     this.hashtags = this.hashtags.map(tag => tag.slice(1));
//   }
//   next();
// });

// // Method to check if a user has liked the post
// postSchema.methods.isLikedBy = function(userId) {
//   return this.likes.includes(userId);
// };

// // Method to toggle like status
// postSchema.methods.toggleLike = async function(userId) {
//   const isLiked = this.isLikedBy(userId);
//   if (isLiked) {
//     this.likes = this.likes.filter(id => !id.equals(userId));
//   } else {
//     this.likes.push(userId);
//   }
//   return this.save();
// };

// const Post = mongoose.model('Post', postSchema);

// module.exports = Post;
// src/models/Post.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters'],
    },
  },
  { timestamps: true }
);

const postSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    caption: { type: String, trim: true, maxlength: [2200, 'Caption cannot exceed 2200 characters'] },

    mediaUrl: { type: String, required: [true, 'Media URL is required'] },
    mediaType: { type: String, enum: ['image', 'video'], required: true },

    audioUrl: { type: String, trim: true, default: null },

    /**
     * IMPORTANT:
     * We are DEPRECATING the unbounded 'likes' array to avoid large-doc growth.
     * Keep it only for backward compatibility during migration,
     * but DO NOT read it in feed APIs. Use Like collection + likeCount instead.
     */
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', select: false }], // deprecated

    comments: [commentSchema],

    location: { type: String, trim: true },

    hashtags: [{ type: String, trim: true }],
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // NEW: O(1) counters
    likeCount: { type: Number, default: 0, index: true },
    commentCount: { type: Number, default: 0, index: true },

    // NEW: tiny sample for quick “liked by …” avatars (latest first)
    likerSample: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// Indexes for common queries
postSchema.index({ user: 1, _id: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ hashtags: 1, _id: -1 });

// Virtuals (keep if you really need them elsewhere, but prefer numeric fields)
postSchema.virtual('likeCountVirtual').get(function () {
  return this.likeCount ?? (Array.isArray(this.likes) ? this.likes.length : 0);
});
postSchema.virtual('commentCountVirtual').get(function () {
  return this.commentCount ?? (Array.isArray(this.comments) ? this.comments.length : 0);
});

// Pre-save: extract hashtags from caption
postSchema.pre('save', function (next) {
  if (this.isModified('caption')) {
    const hashtagRegex = /#[\w]+/g;
    const tags = this.caption?.match(hashtagRegex) || [];
    this.hashtags = tags.map((t) => t.slice(1));
  }
  next();
});

/**
 * DEPRECATED instance helpers below – don't use for new code.
 * Keep temporarily so old routes don’t crash during rollout.
 * New like/unlike should be done via Like model (see Like.js) with
 * atomic $inc on likeCount and $push/$pull on likerSample.
 */
postSchema.methods.isLikedBy = function (userId) {
  // This will only work before migration on existing docs that still have likes populated.
  if (!this.likes) return false;
  return this.likes.some((id) => id.equals(userId));
};

postSchema.methods.toggleLike = async function () {
  throw new Error('toggleLike on Post is deprecated. Use Like model to toggle likes atomically.');
};

module.exports = mongoose.model('Post', postSchema);
