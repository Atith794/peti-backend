const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const User = require('../models/User');

router.get('/search', auth, async (req, res) => {
  const { username } = req.query;

  try {
    const users = await User.find({
      username: { $regex: username, $options: 'i' },
      _id: { $ne: req.user.userId } // exclude self
    }).select('username profilePicture following followers');

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}); 

router.post('/:id/follow', auth, async (req, res) => {
  const userToFollow = await User.findById(req.params.id);
  const currentUser = await User.findById(req.user.userId);

  if (!userToFollow || !currentUser) return res.status(404).json({ error: 'User not found' });

  if (!currentUser.following.includes(userToFollow._id)) {
    currentUser.following.push(userToFollow._id);
    userToFollow.followers.push(currentUser._id);
    await currentUser.save();
    await userToFollow.save();
  }

  res.json({ success: true });
});

router.post('/:id/unfollow', auth, async (req, res) => {
  const userToUnfollow = await User.findById(req.params.id);
  const currentUser = await User.findById(req.user.userId);

  if (!userToUnfollow || !currentUser) return res.status(404).json({ error: 'User not found' });

  currentUser.following.pull(userToUnfollow._id);
  userToUnfollow.followers.pull(currentUser._id);
  await currentUser.save();
  await userToUnfollow.save();

  res.json({ success: true });
});

module.exports = router;