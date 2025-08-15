const helmet = require('helmet');
const cors = require('cors');
const config = require('./index');

const securityConfig = (app) => {
  // CORS configuration
  app.use(cors({
    origin: config.allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }));

  // Security headers
  app.use(helmet());

  // Body parser limit
  app.use(express.json({ limit: config.uploadLimit }));
  app.use(express.urlencoded({ extended: true, limit: config.uploadLimit }));
};