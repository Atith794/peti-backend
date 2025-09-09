const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Like = require('../models/Like');
const auth = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');
const { uploadBufferToStorage } = require('../utils/storage');
const path = require('path');
const mongoose = require('mongoose');

router.post(
  '/',
  auth,
  upload.fields([
    { name: 'media', maxCount: 2 },
    { name: 'audio', maxCount: 2 },
  ]),
  handleUploadError,
  async (req, res) => {
    try {
      const { caption, location } = req.body;
      const mediaFile = req.files?.media?.[0];
      const audioFile = req.files?.audio?.[0];

    if (!mediaFile) {
      return res.status(400).json({ error: 'Media file is required' });
    }

      const userId = req.user.userId;
      const timestamp = Date.now();

      // Decide image vs video for mediaType
      const mediaType = mediaFile.mimetype.startsWith('image/') ? 'image' : 'video';

      // Build Firebase object paths
      const mediaExt = path.extname(mediaFile.originalname || '') || '';
      const mediaDest = `users/${userId}/posts/${timestamp}/media${mediaExt}`;
      const mediaRes = await uploadBufferToStorage({
        buffer: mediaFile.buffer,
        destination: mediaDest,
        contentType: mediaFile.mimetype,
        customMetadata: {
          field: 'media',
          originalName: mediaFile.originalname || '',
          mediaType,
        },
      });

      let audioUrl = null;
      if (audioFile) {
        const audioExt = path.extname(audioFile.originalname || '') || '';
        const audioDest = `users/${userId}/posts/${timestamp}/audio${audioExt}`;
        const audioRes = await uploadBufferToStorage({
          buffer: audioFile.buffer,
          destination: audioDest,
          contentType: audioFile.mimetype,
          customMetadata: {
            field: 'audio',
            originalName: audioFile.originalname || '',
            mediaType: 'audio',
          },
        });
        audioUrl = audioRes.url;
      }

      const post = new Post({
        user: userId,
        caption,
        location,
        mediaUrl: mediaRes.url,   // <— downloadable URL
        mediaType,               // 'image' | 'video'
        audioUrl: audioUrl,      // <— downloadable URL or null
      });

      await post.save();
      await post.populate('user', 'username profilePicture');

      res.status(201).json(post);
    } catch (error) {
      console.error('Error in / route in post.js:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

//Code to fetch paginated data using aggregation with efficient likes counter - V3
router.get('/feed', auth, async (req, res) => {
  try {
    const rawLimit = parseInt(req.query.limit, 10);
    const limit = Math.max(1, Math.min(Number.isFinite(rawLimit) ? rawLimit : 20, 50));
    const cursor = req.query.cursor;
    const match = {};

    if (cursor) {
      if (!mongoose.isValidObjectId(cursor)) {
        return res.status(400).json({ error: 'Invalid cursor' });
      }
      match._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const userId = new mongoose.Types.ObjectId(req.user.userId);

    const pipeline = [
      { $match: match },
      { $sort: { _id: -1 } },
      { $limit: limit + 1 },

      {
        $lookup: {
          from: 'users',
          let: { uid: '$user' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$uid'] } } },
            { $project: { _id: 1, username: 1, profilePicture: 1 } },
          ],
          as: 'user',
        }
      },
      { $unwind: '$user' },

      {
        $lookup: {
          from: 'likes',
          let: { pid: '$_id', uid: userId },
          pipeline: [
            { $match: {
                $expr: {
                  $and: [
                    { $eq: ['$postId', '$$pid'] },
                    { $eq: ['$userId', '$$uid'] },
                  ]
                }
              }
            },
            { $limit: 1 }
          ],
          as: 'meLike'
        }
      },
      { $addFields: { likedByMe: { $gt: [{ $size: '$meLike' }, 0] } } },

      // ✅ Inclusion-only projection
      {
        $project: {
          _id: 1,
          caption: 1,
          mediaUrl: 1,
          mediaType: 1,
          audioUrl: 1,
          createdAt: 1,
          user: 1,
          likeCount: 1,
          commentCount: 1,
          likedByMe: 1,
          hashtags: 1,
          location: 1
        }
      }
    ];

    const items = await Post.aggregate(pipeline).allowDiskUse(true);
    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? String(data[data.length - 1]._id) : null;

    res.json({ data, nextCursor, hasMore });
  } catch (error) {
    console.error('Error in /feed route:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single post
router.get('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'username profilePicture')
      .populate('comments.user', 'username profilePicture');

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    console.error('Error in /:id route:', error);
    res.status(500).json({ error: error.message });
  }
});

// Like/Unlike post
// router.post('/:id/like', auth, async (req, res) => {
//   try {
//     const post = await Post.findById(req.params.id);
//     if (!post) {
//       return res.status(404).json({ error: 'Post not found' });
//     }

//     await post.toggleLike(req.user.userId);
//     res.json({ liked: post.isLikedBy(req.user.userId) });
//   } catch (error) {
//     console.error('Error in /:id/like route:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

//Efficiently handle likes/unlikes
router.post('/:id/like', auth, async (req, res) => {
  try {
    const postId = new mongoose.Types.ObjectId(req.params.id);
    const userId = new mongoose.Types.ObjectId(req.user.userId); // NOTE: your auth sets req.user.userId

    // Ensure post exists (cheap projection)
    const exists = await Post.exists({ _id: postId });
    if (!exists) return res.status(404).json({ error: 'Post not found' });

    // Try to create the like (fast path). Unique index guarantees idempotency.
    try {
      await Like.create({ postId, userId });

      // On success, increment counter & update sample (prepend, cap 20)
      await Post.updateOne(
        { _id: postId },
        {
          $inc: { likeCount: 1 },
          $push: { likerSample: { $each: [userId], $position: 0, $slice: 20 } },
        }
      );

      // Optionally return fresh likeCount without a second read; if you want it:
      const updated = await Post.findById(postId).select('_id likeCount').lean();
      return res.json({ liked: true, likeCount: updated?.likeCount ?? undefined });
    } catch (e) {
      // Duplicate key => user had already liked; interpret as "unlike"
      if (e?.code === 11000) {
        await Like.deleteOne({ postId, userId });
        await Post.updateOne(
          { _id: postId },
          {
            $inc: { likeCount: -1 },
            $pull: { likerSample: userId },
          }
        );
        const updated = await Post.findById(postId).select('_id likeCount').lean();
        return res.json({ liked: false, likeCount: updated?.likeCount ?? undefined });
      }
      throw e;
    }
  } catch (error) {
    console.error('Error in /:id/like route:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add comment
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    post.comments.push({
      user: req.user.userId,
      text
    });

    await post.save();
    await post.populate('comments.user', 'username profilePicture');

    res.json(post.comments[post.comments.length - 1]);
  } catch (error) {
    console.error('Error in /:id/comment route:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete post
router.delete('/:id/delete', auth, async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found or unauthorized' });
    }

    await post.remove();
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error in /:id/delete route:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get posts by hashtag
router.get('/hashtag/:tag', auth, async (req, res) => {
  try {
    const posts = await Post.find({ hashtags: req.params.tag })
      .populate('user', 'username profilePicture')
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    console.error('Error in /hashtag/:tag route:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/by-user/:userId', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 24, 50);
    const cursor = req.query.cursor;
    const userId = req.params.userId;

    const query = { user: userId };
    if (cursor) {
      if (!mongoose.isValidObjectId(cursor)) {
        return res.status(400).json({ error: 'Invalid cursor' });
      }
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const items = await Post.find(query)
      .select('user caption mediaUrl mediaType audioUrl likes comments createdAt')
      .populate('user', 'username profilePicture')
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? String(data[data.length - 1]._id) : null;

    res.json({ data, nextCursor, hasMore });
  } catch (error) {
    console.error("Error in /by-user route:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;