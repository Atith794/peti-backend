// src/middleware/upload.js
//100% working code
// const multer = require('multer');
// const path = require('path');
// const crypto = require('crypto');
// const mime = require('mime-types');

// // Configure storage
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads/');
//   },
//   filename: (req, file, cb) => {
//     // Generate unique filename
//     const uniqueSuffix = crypto.randomBytes(16).toString('hex');
//     cb(null, uniqueSuffix + path.extname(file.originalname));
//   }
// });

// // File filter
// const fileFilter = (req, file, cb) => {
//   // Accept images and videos only
//   console.log("file.mimetype:",file.mimetype)
//   if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')  || file.mimetype.startsWith('audio/')) {
//     cb(null, true);
//   } else {
//     cb(new Error('Unsupported file type'), false);
//   }
// };

// // Configure multer
// const upload = multer({
//   storage: storage,
//   fileFilter: fileFilter,
//   limits: {
//     fileSize: 100 * 1024 * 1024, // 100MB limit
//     files: 2 // Maximum 1 file per request
//   }
// });

// // Error handling middleware
// const handleUploadError = (error, req, res, next) => {
//   if (error instanceof multer.MulterError) {
//     if (error.code === 'LIMIT_FILE_SIZE') {
//       return res.status(400).json({ 
//         error: 'File too large. Maximum size is 10MB' 
//       });
//     }
//     if (error.code === 'LIMIT_FILE_COUNT') { 
//       return res.status(400).json({ 
//         error: 'Too many files. Maximum is 1 file per upload' 
//       });
//     }
//     return res.status(400).json({ error: error.message });
//   }
  
//   if (error.message === 'Unsupported file type') {
//     return res.status(400).json({ 
//       error: 'Only images and videos are allowed' 
//     });
//   }
  
//   next(error);
// };

// module.exports = {
//   upload,
//   handleUploadError
// };

// src/middleware/upload.js
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const mime = require('mime-types'); // npm i mime-types

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');

    // 1) Try original extension
    let ext = (path.extname(file.originalname || '') || '').toLowerCase();

    // 2) If missing or clearly wrong for the mimetype, derive from mimetype
    const fromMime = mime.extension(file.mimetype); // 'mp4', 'mov', 'jpeg', etc.

    // Normalize QuickTime
    if (file.mimetype === 'video/quicktime') {
      ext = '.mov';
    } else if (!ext || ext === '.') {
      ext = fromMime ? `.${fromMime}` : '';
    } else {
      // If original ext conflicts with mimetype (e.g., .jpg but video/*), override
      const isImageExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
      const isVideoExt = ['.mp4', '.mov', '.m4v', '.webm'].includes(ext);
      if (file.mimetype.startsWith('video/') && isImageExt && fromMime) {
        ext = `.${fromMime}`;
      }
      if (file.mimetype.startsWith('image/') && isVideoExt && fromMime) {
        ext = `.${fromMime}`;
      }
    }

    // 3) Last-resort fallbacks
    if (!ext) {
      if (file.mimetype === 'video/mp4') ext = '.mp4';
      else if (file.mimetype === 'video/quicktime') ext = '.mov';
      else if (file.mimetype.startsWith('image/')) ext = '.jpg';
      else if (file.mimetype.startsWith('audio/')) ext = '.mp3';
    }

    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  // console.log('file.mimetype:', file.mimetype);
  if (
    file.mimetype.startsWith('image/') ||
    file.mimetype.startsWith('video/') ||
    file.mimetype.startsWith('audio/')
  ) {
    return cb(null, true);
  }
  cb(new Error('Unsupported file type'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 2, // note: your comment says "Maximum 1 file"; align this with your needs
  },
});

const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 100MB' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files.' });
    }
    return res.status(400).json({ error: error.message });
  }
  if (error.message === 'Unsupported file type') {
    return res.status(400).json({ error: 'Only images, videos, and audio are allowed' });
  }
  next(error);
};

module.exports = { upload, handleUploadError };
