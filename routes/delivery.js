/**
 * Delivery Routes
 * 
 * Defines API endpoints for delivery operations
 */

const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrder,
  updateOrder,
  getPending,
  assignDriver,
  batchOptimizeOrders,
  getDeliveryMetrics
} = require('../controllers/deliveryController');

/**
 * @route   POST /api/delivery/orders
 * @desc    Create a new delivery order
 * @access  Private
 */
router.post('/orders', createOrder);

/**
 * @route   GET /api/delivery/orders/:orderId
 * @desc    Get a delivery order by ID
 * @access  Private
 */
router.get('/orders/:orderId', getOrder);

/**
 * @route   PUT /api/delivery/orders/:orderId
 * @desc    Update a delivery order
 * @access  Private
 */
router.put('/orders/:orderId', updateOrder);

/**
 * @route   GET /api/delivery/orders/pending
 * @desc    Get pending delivery orders
 * @access  Private
 */
router.get('/orders/pending', getPending);

/**
 * @route   POST /api/delivery/orders/:orderId/assign
 * @desc    Assign a driver to a delivery order
 * @access  Private
 */
router.post('/orders/:orderId/assign', assignDriver);

/**
 * @route   POST /api/delivery/batch-optimize
 * @desc    Batch optimize multiple delivery orders
 * @access  Private
 */
router.post('/batch-optimize', batchOptimizeOrders);

/**
 * @route   GET /api/delivery/metrics
 * @desc    Get delivery metrics
 * @access  Private
 */
router.get('/metrics', getDeliveryMetrics);

module.exports = router;