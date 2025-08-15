// routes/message.js
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { upload, handleUploadError } = require('../middleware/upload');

// Fetch messages between two users
router.get('/:user1/:user2', async (req, res) => {
  try {
    const { user1, user2 } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: user1, recipient: user2 },
        { sender: user2, recipient: user1 }
      ]
    }).sort({ createdAt: 1 }); // oldest first

    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/upload-chat-media', upload.single('media'), async (req, res) => {
  console.log('Upload response:', res.data);
  const filePath = req.file.path.replace(/\\/g, '/');
  res.json({ mediaUrl: filePath });
}); 

router.post('/upload', upload.single('media'), async (req, res) => {
  try {
    const { sender, recipient, mediaType } = req.body;
    const mediaUrl = req.file.filename;
    console.log("Media URL:",mediaUrl);
    const message = new Message({
      sender,
      recipient,
      mediaType,
      mediaUrl
    });

    await message.save();
    res.status(201).json(message);
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
