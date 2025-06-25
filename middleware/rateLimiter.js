/**
 * Rate limiting middleware to protect API endpoints from abuse
 */

const rateLimit = require('express-rate-limit');

/**
 * Create a rate limiter middleware with custom configuration
 * @param {Object} options - Rate limiter options
 * @returns {Function} Rate limiter middleware
 */
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes by default
    max: process.env.RATE_LIMIT_MAX_REQUESTS || 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
      error: 'Too Many Requests',
      message: 'You have exceeded the request rate limit. Please try again later.'
    }
  };

  return rateLimit({
    ...defaultOptions,
    ...options
  });
};

/**
 * General API rate limiter
 * Applied to all API routes by default
 */
const apiLimiter = createRateLimiter();

/**
 * Stricter rate limiter for authentication routes
 * To prevent brute force attacks
 */
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    error: 'Too Many Requests',
    message: 'Too many login attempts. Please try again later.'
  }
});

/**
 * Rate limiter for Google Maps API routes
 * To prevent excessive API calls and costs
 */
const mapsApiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 requests per minute
  message: {
    error: 'Too Many Requests',
    message: 'Too many map API requests. Please try again later.'
  }
});

/**
 * Rate limiter for route optimization endpoints
 * These are computationally expensive operations
 */
const optimizationLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 requests per 5 minutes
  message: {
    error: 'Too Many Requests',
    message: 'Too many route optimization requests. Please try again later.'
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  mapsApiLimiter,
  optimizationLimiter,
  createRateLimiter
};