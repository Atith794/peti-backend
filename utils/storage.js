// utils/storage.js
const { v4: uuidv4 } = require('uuid');
const { bucket } = require('../config/firebaseAdmin');

async function uploadBufferToStorage({ buffer, destination, contentType, customMetadata = {} }) {
  const token = uuidv4();
  const file = bucket.file(destination);

  await file.save(buffer, {
    resumable: true,
    metadata: {
      contentType,
      metadata: { firebaseStorageDownloadTokens: token, ...customMetadata },
      cacheControl: 'public, max-age=31536000',
    },
    public: false,
    validation: 'crc32c', 
  });

  const downloadURL =
    `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destination)}?alt=media&token=${token}`;

  const [meta] = await file.getMetadata();

  return {
    path: destination,
    url: downloadURL,
    size: Number(meta.size),
    contentType: meta.contentType || contentType,
    token,
  };
}

async function deleteFromStorage(objectPath) {
  try {
    await bucket.file(objectPath).delete();
    return true;
  } catch (e) {
    if (e.code === 404) return true;
    throw e;
  }
}

module.exports = { uploadBufferToStorage, deleteFromStorage };
