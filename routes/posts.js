// src/routes/posts.js
const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const User = require('../models/User');
// const upload = require('../middleware/upload');
const { upload, handleUploadError } = require('../middleware/upload');

  
// Create a new post
// router.post('/', auth, upload.single('media'), async (req, res) => {
//   try {
//     const { caption, location } = req.body;
    
//     if (!req.file) {
//       return res.status(400).json({ error: 'Media file is required' });
//     }

//     const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';

//     const post = new Post({
//       user: req.user.userId,
//       caption,
//       location,
//       // mediaUrl: req.file.path,
//       mediaUrl: req.file.path.replace(/\\/g, '/'),
//       mediaType
//     });

//     await post.save();

//     await post.populate('user', 'username profilePicture');
    
//     res.status(201).json(post);
//   } catch (error) {
//     console.error("Error in creating post:",error)
//     res.status(500).json({ error: error.message });
//   }
// });

router.post('/', auth, upload.fields([
  { name: 'media', maxCount: 2 },
  { name: 'audio', maxCount: 2 }
]), async (req, res) => {
  try {
    const { caption, location } = req.body;
  console.log('Uploaded files:', req.files);

    const mediaFile = req.files?.media?.[0];
    const audioFile = req.files?.audio?.[0]; // may be undefined

    if (!mediaFile) {
      return res.status(400).json({ error: 'Media file is required' });
    }

    const mediaType = mediaFile.mimetype.startsWith('image/') ? 'image' : 'video';

    const post = new Post({
      user: req.user.userId,
      caption,
      location,
      mediaUrl: mediaFile.path.replace(/\\/g, '/'),
      mediaType,
      ...(audioFile && {
        audioUrl: audioFile.path.replace(/\\/g, '/')
      })
    });

    await post.save();
    await post.populate('user', 'username profilePicture');

    res.status(201).json(post);
  } catch (error) {
    console.error("Error in creating post:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get feed posts
router.get('/feed', auth, async (req, res) => {
  try {
    // const currentUser = await User.findById(req.user.userId);
    // const following = currentUser.following;

    // const posts = await Post.find({
    //   $or: [
    //     { user: { $in: following } },
    //     { user: req.user.userId }
    //   ]
    // })
    // .populate('user', 'username profilePicture')
    // .populate('comments.user', 'username profilePicture')
    // .sort({ createdAt: -1 })
    // .limit(20);
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