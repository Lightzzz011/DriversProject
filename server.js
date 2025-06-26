/**
 * Main server file for Logistics Route Optimizer
 */

// Load environment variables
require('dotenv').config();

// Import dependencies
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

// Import middleware
const { errorHandler, notFoundHandler, asyncHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const { verifyToken } = require('./middleware/auth');

// Import routes
const routeOptimizationRoutes = require('./routes/routeOptimization');
const deliveryRoutes = require('./routes/delivery');
const driverRoutes = require('./routes/driver');

// Import socket handlers
const chatHandler = require('./socket/chatHandler');

// Import logger
const { logger, logApiCall } = require('./utils/logger');

// Initialize Firebase
require('./services/firebase');

// Create Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Create Socket.io server
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Set port
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('dev'));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Apply rate limiting to API routes
app.use('/api', apiLimiter);

// API Routes
app.use('/api/route-optimization', routeOptimizationRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/driver', driverRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root route - serve the frontend
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  fs.readFile(indexPath, 'utf8', (err, data) => {
    if (err) {
      logger.error(`Error reading index.html: ${err.message}`);
      return res.status(500).send('Error loading page.');
    }
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    const modifiedHtml = data.replace('YOUR_GOOGLE_MAPS_API_KEY_PLACEHOLDER', googleMapsApiKey);
    res.send(modifiedHtml);
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Socket.io connection handler
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  
  // Set up authentication for socket
  socket.on('authenticate', (data) => {
    // In a real app, verify the token with Firebase
    // For now, just store the user data
    socket.user = data;
    logger.info(`Socket authenticated: ${socket.id} - User: ${data.userId}`);
  });
  
  // Set up chat handlers
  chatHandler(io, socket);
  
  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Start the server
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`, { stack: err.stack });
  // In production, we might want to exit the process
  // process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
  // In production, we might want to exit the process
  // process.exit(1);
});

module.exports = { app, server }; // Export for testing