// src/routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { registerUpload } = require('../middleware/registerUpload');
// require('dotenv').config();
const JWT_SECRET = 'your_jwt_secret_key_skfjm'

// Register a new user
// router.post('/register', async (req, res) => {
//   try {
//     const { username, email, password, petname } = req.body;

//     // Check if user already exists
//     const userExists = await User.findOne({ 
//       $or: [{ email }, { username }] 
//     });

//     if (userExists) {
//       return res.status(400).json({ 
//         error: 'User with this email or username already exists' 
//       });
//     }

//     // Create new user
//     const user = new User({
//       username,
//       email,
//       password,
//       petname
//     });

//     await user.save();

//     // Generate JWT token
//     const token = jwt.sign(
//       { userId: user._id },
//       JWT_SECRET,
//       { expiresIn: '30d' }
//     );

//     res.status(201).json({
//       token,
//       user: user.toPublicProfile()
//     });
//   } catch (error) {
//     console.error("Error while registering:",error);
//     res.status(500).json({ error: error.message });
//   }
// });

router.post(
  '/register',
  registerUpload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'pets', maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      const { username, email, password, petname } = req.body;

      // Handle arrays from multipart (petNames[] can be string or array)
      const rawPetNames = req.body['petNames[]'] ?? req.body.petNames ?? [];
      const petNames = Array.isArray(rawPetNames) ? rawPetNames : [rawPetNames].filter(Boolean);

      // Uniqueness
      const userExists = await User.findOne({ $or: [{ email }, { username }] });
      if (userExists) {
        return res.status(400).json({ error: 'User with this email or username already exists' });
      }

      // Files
      const profileFile = req.files?.profilePicture?.[0];
      const petFiles = req.files?.pets || [];

      if (petFiles.length > 5) {
        return res.status(400).json({ error: 'You can upload up to 5 pet photos' });
      }

      // Build pets array, pair file with name by index
      const pets = petFiles.map((f, i) => ({
        name: petNames[i] || `Pet ${i + 1}`,
        photoUrl: f.path.replace(/\\/g, '/'),
      }));

      const user = new User({
        username,
        email,
        password,
        petname,
        profilePicture: profileFile ? profileFile.path.replace(/\\/g, '/') : undefined,
        pets,
      });

      await user.save();

      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });

      res.status(201).json({
        token,
        user: user.toPublicProfile(),
      });
    } catch (error) {
      console.error('Error while registering:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Login user
// router.post('/login', async (req, res) => {
//   try {
//     const { username, password } = req.body;

//     // Find user by email
//     const user = await User.findOne({ username });
//     if (!user) {
//       return res.status(401).json({ error: 'Invalid credentials' });
//     }

//     // Check password
//     const isMatch = await user.comparePassword(password);
//     if (!isMatch) {
//       return res.status(401).json({ error: 'Invalid credentials' });
//     }
//     console.log("user._id:",user._id)
//     // Generate JWT token
//     const token = jwt.sign(
//       { userId: user._id },
//       JWT_SECRET,
//       { expiresIn: '30d' }
//     );

//     res.json({
//       token,
//       user: user.toPublicProfile()
//     });
//   } catch (error) {
//     console.error("Error while Logging in:",error);

//     res.status(500).json({ error: error.message });
//   }
// });

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Send token and userId explicitly
    res.json({
      token,
      userId: user._id, // 👈 Send this separately
      user: user.toPublicProfile() // Optional additional public info
    });
  } catch (error) {
    console.error("Error while Logging in:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user profile
router.get('/me', auth, async (req, res) => {
  // const token = await AsyncStorage.getItem('token');
  // console.log("Token:", token);
  try {
    // console.log("req.user:", req.user);
    const user = await User.findById(req.user.userId)
      .select('-password')
      .populate('posts');
    // console.log("Fetched user:", user);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { bio, email, username } = req.body;
    const updates = {};

    if (bio) updates.bio = bio;
    if (email) updates.email = email;
    if (username) updates.username = username;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Follow/Unfollow user
router.post('/follow/:userId', auth, async (req, res) => {
  try {
    if (req.user.userId === req.params.userId) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    const userToFollow = await User.findById(req.params.userId);
    const currentUser = await User.findById(req.user.userId);

    if (!userToFollow) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isFollowing = currentUser.following.includes(req.params.userId);

    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(
        id => id.toString() !== req.params.userId
      );
      userToFollow.followers = userToFollow.followers.filter(
        id => id.toString() !== req.user.userId
      );
    } else {
      // Follow
      currentUser.following.push(req.params.userId);
      userToFollow.followers.push(req.user.userId);
    }

    await Promise.all([currentUser.save(), userToFollow.save()]);

    res.json({
      following: isFollowing ? false : true,
      user: userToFollow.toPublicProfile()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;