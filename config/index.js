// We should add config/index.js for environment variables
module.exports = {
    port: process.env.PORT || 5000,
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpire: '30d',
    uploadLimit: '10mb',
    allowedOrigins: ['http://localhost:5000']  // for CORS
  };