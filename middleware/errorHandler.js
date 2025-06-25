/**
 * Error handling middleware for the application
 */

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // Check if headers have already been sent
  if (res.headersSent) {
    return next(err);
  }
  
  // Handle different types of errors
  if (err.name === 'ValidationError') {
    // Handle validation errors (e.g., from Joi or express-validator)
    return res.status(400).json({
      error: 'Validation Error',
      details: err.details || err.message
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    // Handle authentication errors
    return res.status(401).json({
      error: 'Unauthorized',
      message: err.message
    });
  }
  
  if (err.name === 'ForbiddenError') {
    // Handle authorization errors
    return res.status(403).json({
      error: 'Forbidden',
      message: err.message
    });
  }
  
  if (err.name === 'NotFoundError') {
    // Handle not found errors
    return res.status(404).json({
      error: 'Not Found',
      message: err.message
    });
  }
  
  if (err.code === 'ECONNABORTED' || err.name === 'TimeoutError') {
    // Handle timeout errors (e.g., from external API calls)
    return res.status(408).json({
      error: 'Request Timeout',
      message: 'The request took too long to process'
    });
  }
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    // Handle file size limit errors (from multer)
    return res.status(413).json({
      error: 'Payload Too Large',
      message: 'File size exceeds the limit'
    });
  }
  
  if (err.type === 'entity.too.large') {
    // Handle request body size limit errors
    return res.status(413).json({
      error: 'Payload Too Large',
      message: 'Request body is too large'
    });
  }
  
  if (err.name === 'RateLimitError') {
    // Handle rate limit errors
    return res.status(429).json({
      error: 'Too Many Requests',
      message: err.message || 'Rate limit exceeded'
    });
  }
  
  // Default to 500 internal server error
  return res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message
  });
};

/**
 * Not found middleware for handling undefined routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
};

/**
 * Create a custom error with status code
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @returns {Error} Custom error object
 */
const createError = (message, statusCode = 500) => {
  const error = new Error(message);
  
  // Set error name based on status code
  switch (statusCode) {
    case 400:
      error.name = 'ValidationError';
      break;
    case 401:
      error.name = 'UnauthorizedError';
      break;
    case 403:
      error.name = 'ForbiddenError';
      break;
    case 404:
      error.name = 'NotFoundError';
      break;
    case 429:
      error.name = 'RateLimitError';
      break;
    default:
      error.name = 'ServerError';
  }
  
  error.statusCode = statusCode;
  return error;
};

/**
 * Async handler to catch errors in async route handlers
 * @param {Function} fn - Async route handler function
 * @returns {Function} Middleware function that catches errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  createError,
  asyncHandler
};