/**
 * Driver Routes
 * 
 * Defines API endpoints for driver operations
 */

const express = require('express');
const router = express.Router();
const {
  getDriverAssignedOrders,
  updateLocation,
  getLocationHistory,
  updateAvailability,
  getAvailableDrivers,
  getDriverPerformance
} = require('../controllers/driverController');

/**
 * @route   GET /api/driver/:driverId/orders
 * @desc    Get all orders assigned to a driver
 * @access  Private
 */
router.get('/:driverId/orders', getDriverAssignedOrders);

/**
 * @route   POST /api/driver/:driverId/location
 * @desc    Update driver's current location
 * @access  Private
 */
router.post('/:driverId/location', updateLocation);

/**
 * @route   GET /api/driver/:driverId/location/history
 * @desc    Get driver's location history
 * @access  Private
 */
router.get('/:driverId/location/history', getLocationHistory);

/**
 * @route   PUT /api/driver/:driverId/availability
 * @desc    Update driver's availability status
 * @access  Private
 */
router.put('/:driverId/availability', updateAvailability);

/**
 * @route   GET /api/driver/available
 * @desc    Get all available drivers
 * @access  Private
 */
router.get('/available', getAvailableDrivers);

/**
 * @route   GET /api/driver/:driverId/performance
 * @desc    Get driver performance metrics
 * @access  Private
 */
router.get('/:driverId/performance', getDriverPerformance);

module.exports = router;