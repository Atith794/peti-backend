// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const path = require('path');
// const { connectDB } = require('./config/db');

// // Import routes
// const authRoutes = require('./routes/auth');
// const postRoutes = require('./routes/posts');

// const app = express();

// // Connect to MongoDB
// connectDB();

// // Middlewares
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Serve uploaded files
// app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// // Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/posts', postRoutes);

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).send('Something broke!');
// });

// // Health check route
// app.get('/health', (req, res) => {
//   res.status(200).json({ status: 'ok' });
// });

// const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

// // Handle unhandled promise rejections
// process.on('unhandledRejection', (err) => {
//   console.log('UNHANDLED REJECTION! 💥 Shutting down...');
//   console.log(err.name, err.message);
//   process.exit(1);
// });


// const express = require('express');
// const config = require('./config');
// const errorHandler = require('./middleware/errorHandler');
// const { apiLimiter } = require('./middleware/rateLimiter');
// const securityConfig = require('./config/security');
// const logger = require('./utils/logger');

// const app = express();

// // Apply security configurations
// securityConfig(app);

// // Apply rate limiting to all routes
// app.use('/api/', apiLimiter);

// // Routes
// app.use('/api/auth', require('./routes/auth')); 
// app.use('/api/posts', require('./routes/posts'));

// // Error handling
// app.use(errorHandler);

// // Unhandled rejection handling
// process.on('unhandledRejection', (err) => {
//   logger.error('Unhandled Rejection:', err);
//   // Don't crash in production
//   if (process.env.NODE_ENV === 'development') {
//     process.exit(1);
//   }
// });

//Working code V2
// src/index.js
// require('dotenv').config();
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const path = require('path');
// const morgan = require('morgan');
// // const { Server } = require('socket.io');
// const SocketIO = require('socket.io');
// const Message = require('./models/Message');
// const http = require('http');
// // Import routes
// const authRoutes = require('./routes/auth');
// const postRoutes = require('./routes/posts');
// const userRoutes = require('./routes/user');

// // Import configurations and utilities
// const securityConfig = require('./config/security');
// const logger = require('./utils/logger');
// const { connectDB } = require('./config/db');

// // Initialize express app
// const app = express();

// // Apply security configurations
// securityConfig(app);

// // Basic middleware
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Logging middleware
// app.use(morgan('combined', { stream: logger.stream }));

// // Serve uploaded files
// app.use('/uploads', express.static(path.join(__dirname, './uploads')));

// // Connect to MongoDB
// connectDB()
//   .then(() => {
//     logger.info('MongoDB connected successfully');
//   })
//   .catch((err) => {
//     logger.error('MongoDB connection error:', err);
//     process.exit(1);
//   });

// // Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/posts', postRoutes);
// app.use('/api/users', userRoutes);

// // Health check route
// app.get('/health', (req, res) => {
//   res.status(200).json({ status: 'ok' });
// });

// // Error handling middleware
// app.use((err, req, res, next) => {
//   logger.error(err.stack);
//   res.status(500).json({
//     error: 'Something broke!',
//     message: process.env.NODE_ENV === 'development' ? err.message : undefined
//   });
// });

// // Handle unhandled routes
// app.use((req, res) => {
//   res.status(404).json({ error: 'Route not found' });
// });

// const PORT = process.env.PORT || 5000;

// const socketserver = http.createServer(app);
// // const io = new Server(socketserver, {
// const io = new SocketIO.Server(socketserver, {
//   cors: {
//     origin: '*'
//   }
// }); 

// const connectedUsers = new Map();

// io.on('connection', (socket) => {
//   console.log('A user connected');

//   socket.on('register', (userId) => {
//     connectedUsers.set(userId, socket.id);
//     socket.userId = userId;
//   });

//   socket.on('send-message', async ({ to, from, text }) => {
//     const message = new Message({ sender: from, recipient: to, text });
//     await message.save();

//     const recipientSocketId = connectedUsers.get(to);
//     if (recipientSocketId) {
//       io.to(recipientSocketId).emit('receive-message', {
//         from,
//         text,
//         timestamp: new Date()
//       });
//     }
//   });

//   socket.on('disconnect', () => {
//     connectedUsers.delete(socket.userId);
//     console.log('A user disconnected');
//   });
// });

// // Start server
// const server = app.listen(PORT, () => {
//   logger.info(`Server is running on port ${PORT}`);
// });

// // Handle unhandled promise rejections
// process.on('unhandledRejection', (err) => {
//   logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
//   logger.error(err.name, err.message);
//   console.error(err.name, err.message, err.stack);
//   server.close(() => {
//     process.exit(1);
//   });
// });

// // Handle uncaught exceptions
// process.on('uncaughtException', (err) => {
//   logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
//   logger.error(err.name, err.message);
//   process.exit(1);
// });

//Working code - /v3
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const SocketIO = require('socket.io');
const Message = require('./models/Message');
const http = require('http');
require('./config/firebaseAdmin');

// Import routes
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/user');
const messageRoutes = require('./routes/message');

// Import configurations and utilities
const securityConfig = require('./config/security');
const logger = require('./utils/logger');
const { connectDB } = require('./config/db');

// Initialize express app
const app = express();

// Apply security configurations
securityConfig(app);

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('combined', { stream: logger.stream }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, './uploads')));

// Connect to MongoDB
connectDB()
  .then(() => {
    logger.info('MongoDB connected successfully');
  })
  .catch((err) => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({
    error: 'Something broke!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Handle unhandled routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// Create HTTP server with Express app
const server = http.createServer(app);

// Initialize Socket.IO with the same server
const io = new SocketIO.Server(server, {
  cors: {
    origin: '*'
  }
}); 

const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('register', (userId) => {
    connectedUsers.set(userId, socket.id);
    socket.userId = userId;
  });

  socket.on('send-message', async ({ to, from, text }) => {
    try {
      const message = new Message({ sender: from, recipient: to, text });
      await message.save();

      const recipientSocketId = connectedUsers.get(to);
      console.log('[message saved]', message);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receive-message', {
          from,
          text,
          timestamp: new Date()
        });
      }
    } catch (error) {
      logger.error('Error saving message:', error);
      socket.emit('message-error', { error: 'Failed to send message' });
    }
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
    }
    console.log('A user disconnected');
  });
});

// Start server (this will handle both Express and Socket.IO)
server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  console.error(err.name, err.message, err.stack);
  server.close(() => {
    process.exit(1); 
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  process.exit(1);
});