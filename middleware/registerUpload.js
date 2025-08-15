// src/middleware/registerUpload.js
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const mime = require('mime-types');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    let ext = (path.extname(file.originalname || '') || '').toLowerCase();
    if (!ext || ext === '.') {
      const fromMime = mime.extension(file.mimetype);
      if (fromMime) ext = `.${fromMime}`;
    }
    if (!ext) ext = '.jpg';
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const imageOnly = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
  cb(new Error('Only image files are allowed for profile/pets'));
};

const registerUpload = multer({
  storage,
  fileFilter: imageOnly,
  limits: { fileSize: 10 * 1024 * 1024, files: 6 }, // 10MB each, up to 6 files
});

module.exports = { registerUpload };
