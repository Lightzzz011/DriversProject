/**
 * Authentication middleware for Firebase
 * Verifies the Firebase ID token in the request header
 */

const { admin } = require('../services/firebase');

/**
 * Middleware to verify Firebase authentication token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  
  const token = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return res.status(403).json({ error: 'Forbidden: Invalid token' });
  }
};

/**
 * Middleware to check if user has admin role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  
  next();
};

/**
 * Middleware to check if user is a driver
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const isDriver = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }
  
  if (req.user.role !== 'driver') {
    return res.status(403).json({ error: 'Forbidden: Driver access required' });
  }
  
  next();
};

/**
 * Middleware to check if user is a customer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const isCustomer = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }
  
  if (req.user.role !== 'customer') {
    return res.status(403).json({ error: 'Forbidden: Customer access required' });
  }
  
  next();
};

/**
 * Middleware to check if user is authorized for a specific driver
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const isAuthorizedDriver = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }
  
  // Allow admins to access any driver data
  if (req.user.role === 'admin') {
    return next();
  }
  
  // Check if the user is the driver they're trying to access
  if (req.user.role === 'driver' && req.user.uid === req.params.driverId) {
    return next();
  }
  
  return res.status(403).json({ error: 'Forbidden: Not authorized to access this driver data' });
};

/**
 * Middleware to check if user is authorized for a specific order
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const isAuthorizedForOrder = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }
  
  // Allow admins to access any order
  if (req.user.role === 'admin') {
    return next();
  }
  
  const orderId = req.params.orderId;
  
  try {
    // Get the order from Firestore
    const orderRef = admin.firestore().collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const orderData = orderDoc.data();
    
    // Check if the user is the customer who placed the order
    if (req.user.role === 'customer' && req.user.uid === orderData.customerId) {
      return next();
    }
    
    // Check if the user is the driver assigned to the order
    if (req.user.role === 'driver' && req.user.uid === orderData.driverId) {
      return next();
    }
    
    return res.status(403).json({ error: 'Forbidden: Not authorized to access this order' });
  } catch (error) {
    console.error('Error checking order authorization:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  verifyToken,
  isAdmin,
  isDriver,
  isCustomer,
  isAuthorizedDriver,
  isAuthorizedForOrder
};