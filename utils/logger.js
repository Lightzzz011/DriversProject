/**
 * Logger utility for application-wide logging and monitoring
 */

const winston = require('winston');
const { format } = winston;

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'http';
};

// Define colors for each log level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

// Add colors to winston
winston.addColors(colors);

// Define the format for logs
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define the format for console output
const consoleFormat = format.combine(
  format.colorize({ all: true }),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define transports for winston
const transports = [
  // Console transport for all logs
  new winston.transports.Console({
    format: consoleFormat
  }),
  
  // File transport for error logs
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: logFormat
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: logFormat
  }),
  
  // File transport for API calls
  new winston.transports.File({
    filename: 'logs/api.log',
    level: 'http',
    format: logFormat
  })
];

// Create the logger instance
const logger = winston.createLogger({
  level: level(),
  levels,
  format: logFormat,
  transports
});

/**
 * Log API calls with request details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} responseTime - Response time in milliseconds
 */
const logApiCall = (req, res, responseTime) => {
  const { method, originalUrl, ip, headers } = req;
  const userAgent = headers['user-agent'];
  const statusCode = res.statusCode;
  
  logger.http(
    `${method} ${originalUrl} ${statusCode} ${responseTime}ms - ${ip} - ${userAgent}`
  );
};

/**
 * Log Google Maps API calls for monitoring usage
 * @param {string} endpoint - The Maps API endpoint called
 * @param {Object} params - Parameters sent to the API
 * @param {number} responseTime - Response time in milliseconds
 * @param {boolean} success - Whether the call was successful
 */
const logMapsApiCall = (endpoint, params, responseTime, success) => {
  const status = success ? 'SUCCESS' : 'FAILED';
  logger.http(
    `MAPS API: ${endpoint} - ${status} - ${responseTime}ms - ${JSON.stringify(params)}`
  );
  
  // Track API usage in Firebase or other monitoring system
  // This would be implemented in a real application
};

/**
 * Log route optimization performance
 * @param {string} algorithm - The algorithm used (dijkstra, tsp)
 * @param {number} pointCount - Number of points in the route
 * @param {number} computationTime - Computation time in milliseconds
 * @param {number} distanceSaved - Distance saved in kilometers
 * @param {number} timeSaved - Time saved in minutes
 */
const logOptimizationPerformance = (algorithm, pointCount, computationTime, distanceSaved, timeSaved) => {
  logger.info(
    `OPTIMIZATION: ${algorithm} - ${pointCount} points - ${computationTime}ms - Saved: ${distanceSaved.toFixed(2)}km, ${timeSaved.toFixed(2)}min`
  );
  
  // Track optimization metrics in Firebase or other monitoring system
  // This would be implemented in a real application
};

/**
 * Log delivery status changes
 * @param {string} orderId - The order ID
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 * @param {string} driverId - Driver ID (if applicable)
 */
const logDeliveryStatusChange = (orderId, oldStatus, newStatus, driverId = null) => {
  const driverInfo = driverId ? `- Driver: ${driverId}` : '';
  logger.info(
    `DELIVERY: ${orderId} - Status changed from ${oldStatus} to ${newStatus} ${driverInfo}`
  );
};

/**
 * Log errors with additional context
 * @param {Error} error - The error object
 * @param {string} context - Context where the error occurred
 * @param {Object} additionalInfo - Any additional information
 */
const logError = (error, context, additionalInfo = {}) => {
  logger.error(
    `ERROR in ${context}: ${error.message} - ${JSON.stringify({
      stack: error.stack,
      ...additionalInfo
    })}`
  );
};

module.exports = {
  logger,
  logApiCall,
  logMapsApiCall,
  logOptimizationPerformance,
  logDeliveryStatusChange,
  logError
};