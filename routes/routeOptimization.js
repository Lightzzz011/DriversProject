/**
 * Route Optimization Routes
 * 
 * Defines API endpoints for route optimization operations
 */

const express = require('express');
const router = express.Router();
const {
  optimizeRoute,
  reoptimizeCurrentRoute,
  getRouteTrafficData,
  compareAlgorithms,
  simulateFuelSavings
} = require('../controllers/routeOptimizationController');

/**
 * @route   POST /api/route-optimization/optimize
 * @desc    Optimize delivery route
 * @access  Private
 */
router.post('/optimize', optimizeRoute);

/**
 * @route   POST /api/route-optimization/reoptimize
 * @desc    Reoptimize route based on current position and traffic
 * @access  Private
 */
router.post('/reoptimize', reoptimizeCurrentRoute);

/**
 * @route   POST /api/route-optimization/traffic
 * @desc    Get traffic data for a route segment
 * @access  Private
 */
router.post('/traffic', getRouteTrafficData);

/**
 * @route   POST /api/route-optimization/compare
 * @desc    Compare route optimization algorithms
 * @access  Private
 */
router.post('/compare', compareAlgorithms);

/**
 * @route   POST /api/route-optimization/simulate-fuel-savings
 * @desc    Simulate fuel savings with optimized routes
 * @access  Private
 */
router.post('/simulate-fuel-savings', simulateFuelSavings);

module.exports = router;