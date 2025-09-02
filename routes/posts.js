const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const User = require('../models/User');
const { upload, handleUploadError } = require('../middleware/upload');
const { uploadBufferToStorage } = require('../utils/storage');
const path = require('path');
  



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
      console.error('Error in creating post:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get feed posts
router.get('/feed', auth, async (req, res) => {
  try {
    const posts = await Post.find({})
      .populate('user', 'username profilePicture')
      .populate('comments.user', 'username profilePicture')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(posts);
  } catch (error) {
    console.error("Error in /feed:", error); 
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
    res.status(500).json({ error: error.message });
  }
});

// Like/Unlike post
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await post.toggleLike(req.user.userId);
    res.json({ liked: post.isLikedBy(req.user.userId) });
  } catch (error) {
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
    res.status(500).json({ error: error.message });
  }
});

// Delete post
router.delete('/:id', auth, async (req, res) => {
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
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;