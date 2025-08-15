// src/config/security.js
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const express = require('express');

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:19006'], // Add your frontend URLs
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  maxAge: 600 // Maximum age (in seconds) of the CORS preflight responses caching
};

const securityConfig = (app) => {
  // Basic security headers using helmet
  app.use(helmet());

  // Specific security headers
  app.use(helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      mediaSrc: ["'self'", 'data:', 'blob:']
    }
  }));

  // CORS middleware
  app.use(cors(corsOptions));

  // Rate limiting
  app.use('/api/', limiter);

  // Body parser with size limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // XSS protection
  app.use(helmet.xssFilter());

  // Prevent MIME type sniffing
  app.use(helmet.noSniff());

  // Hide X-Powered-By header
  app.disable('x-powered-by');

  // Prevent clickjacking
  app.use(helmet.frameguard({ action: 'deny' }));

  // HTTP Strict Transport Security
  app.use(helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }));

  // Prevent cross-domain policies
  app.use(helmet.permittedCrossDomainPolicies());

  // DNS Prefetch Control
  app.use(helmet.dnsPrefetchControl());
};

module.exports = securityConfig;