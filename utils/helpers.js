// src/utils/helpers.js
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;

/**
 * Generate a random string of specified length
 * @param {number} length - Length of the string to generate
 * @returns {string} Random string
 */
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if email is valid
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Extract hashtags from text
 * @param {string} text - Text to extract hashtags from
 * @returns {string[]} Array of hashtags without the # symbol
 */
const extractHashtags = (text) => {
  const hashtagRegex = /#[\w]+/g;
  const hashtags = text.match(hashtagRegex) || [];
  return hashtags.map(tag => tag.slice(1));
};

/**
 * Extract mentions from text
 * @param {string} text - Text to extract mentions from
 * @returns {string[]} Array of mentions without the @ symbol
 */
const extractMentions = (text) => {
  const mentionRegex = /@[\w]+/g;
  const mentions = text.match(mentionRegex) || [];
  return mentions.map(mention => mention.slice(1));
};

/**
 * Format file size to human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Delete file from uploads directory
 * @param {string} filePath - Path to the file
 * @returns {Promise<void>}
 */
const deleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
  }
};

/**
 * Validate file type
 * @param {string} mimeType - File MIME type
 * @returns {boolean} True if file type is valid
 */
const isValidFileType = (mimeType) => {
  const validTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'video/quicktime'
  ];
  return validTypes.includes(mimeType);
};

/**
 * Paginate array of items
 * @param {Array} items - Array of items to paginate
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} Paginated results with metadata
 */
const paginateResults = (items, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const results = {
    results: items.slice(startIndex, endIndex),
    totalItems: items.length,
    currentPage: page,
    totalPages: Math.ceil(items.length / limit),
    hasMore: endIndex < items.length
  };

  return results;
};

/**
 * Create slug from string
 * @param {string} text - Text to convert to slug
 * @returns {string} URL-friendly slug
 */
const createSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/-+/g, '-'); // Replace multiple - with single -
};

/**
 * Format date to relative time
 * @param {Date} date - Date to format
 * @returns {string} Relative time string
 */
const getRelativeTime = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };

  for (const [unit, seconds] of Object.entries(intervals)) {
    const interval = Math.floor(diffInSeconds / seconds);
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
    }
  }

  return 'Just now';
};

/**
 * Sanitize user input to prevent XSS
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
const sanitizeText = (text) => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

module.exports = {
  generateRandomString,
  isValidEmail,
  extractHashtags,
  extractMentions,
  formatFileSize,
  deleteFile,
  isValidFileType,
  paginateResults,
  createSlug,
  getRelativeTime,
  sanitizeText
};