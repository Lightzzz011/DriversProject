/**
 * Route Optimization Controller
 * 
 * Handles API endpoints for route optimization operations
 */

const { findOptimalRoute, calculateRouteMetrics, reoptimizeRoute } = require('../algorithms/dijkstra');
const { findOptimalRouteTSP, calculateTSPRouteMetrics } = require('../algorithms/tsp');
const { geocodeAddress, getTrafficData } = require('../services/googleMaps');
const { incrementApiCallCounter } = require('../services/firebase');

/**
 * Optimize delivery route using Dijkstra's algorithm
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function optimizeRoute(req, res) {
  try {
    const { deliveryPoints, startPoint, algorithm = 'dijkstra' } = req.body;
    
    if (!deliveryPoints || !Array.isArray(deliveryPoints) || deliveryPoints.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Delivery points are required and must be a non-empty array'
      });
    }
    
    if (!startPoint || !startPoint.lat || !startPoint.lng) {
      return res.status(400).json({
        success: false,
        message: 'Start point with lat/lng coordinates is required'
      });
    }
    
    // Track API call
    incrementApiCallCounter('routeOptimization');
    
    // Process delivery points (geocode addresses if needed)
    const processedPoints = await Promise.all(deliveryPoints.map(async point => {
      // If point has address but no coordinates, geocode it
      if (point.address && (!point.lat || !point.lng)) {
        const geocoded = await geocodeAddress(point.address);
        return {
          ...point,
          lat: geocoded.lat,
          lng: geocoded.lng,
          formattedAddress: geocoded.formattedAddress
        };
      }
      return point;
    }));
    
    // Choose algorithm based on request
    let optimizedRoute;
    let routeMetrics;
    
    if (algorithm.toLowerCase() === 'tsp') {
      // Use TSP algorithm
      optimizedRoute = await findOptimalRouteTSP(processedPoints, startPoint);
      routeMetrics = await calculateTSPRouteMetrics(optimizedRoute);
    } else {
      // Default to Dijkstra's algorithm
      optimizedRoute = await findOptimalRoute(processedPoints, startPoint);
      routeMetrics = await calculateRouteMetrics(optimizedRoute);
    }
    
    res.status(200).json({
      success: true,
      data: {
        optimizedRoute,
        metrics: routeMetrics,
        algorithm: algorithm.toLowerCase()
      }
    });
  } catch (error) {
    console.error('Error in route optimization:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to optimize route',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
}

/**
 * Reoptimize route based on current position and traffic conditions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function reoptimizeCurrentRoute(req, res) {
  try {
    const { currentRoute, currentPosition, currentPointIndex, algorithm = 'dijkstra' } = req.body;
    
    if (!currentRoute || !Array.isArray(currentRoute) || currentRoute.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Current route is required and must be a non-empty array'
      });
    }
    
    if (!currentPosition || !currentPosition.lat || !currentPosition.lng) {
      return res.status(400).json({
        success: false,
        message: 'Current position with lat/lng coordinates is required'
      });
    }
    
    if (currentPointIndex === undefined || currentPointIndex < 0 || currentPointIndex >= currentRoute.length) {
      return res.status(400).json({
        success: false,
        message: 'Valid current point index is required'
      });
    }
    
    // Track API call
    incrementApiCallCounter('routeReoptimization');
    
    // Reoptimize route
    let reoptimizedRoute;
    let routeMetrics;
    
    if (algorithm.toLowerCase() === 'tsp') {
      // Use TSP algorithm
      const remainingPoints = currentRoute.slice(currentPointIndex);
      reoptimizedRoute = await findOptimalRouteTSP(
        remainingPoints.slice(1), // Exclude current point
        currentPosition // Use current position as start
      );
      
      // Combine completed part with reoptimized part
      reoptimizedRoute = [...currentRoute.slice(0, currentPointIndex), ...reoptimizedRoute];
      routeMetrics = await calculateTSPRouteMetrics(reoptimizedRoute);
    } else {
      // Default to Dijkstra's algorithm
      reoptimizedRoute = await reoptimizeRoute(currentRoute, currentPointIndex);
      routeMetrics = await calculateRouteMetrics(reoptimizedRoute);
    }
    
    res.status(200).json({
      success: true,
      data: {
        reoptimizedRoute,
        metrics: routeMetrics,
        algorithm: algorithm.toLowerCase()
      }
    });
  } catch (error) {
    console.error('Error in route reoptimization:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reoptimize route',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
}

/**
 * Get traffic data for a route segment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getRouteTrafficData(req, res) {
  try {
    const { origin, destination } = req.body;
    
    if (!origin || !origin.lat || !origin.lng) {
      return res.status(400).json({
        success: false,
        message: 'Origin with lat/lng coordinates is required'
      });
    }
    
    if (!destination || !destination.lat || !destination.lng) {
      return res.status(400).json({
        success: false,
        message: 'Destination with lat/lng coordinates is required'
      });
    }
    
    // Track API call
    incrementApiCallCounter('trafficData');
    
    // Get traffic data
    const trafficData = await getTrafficData(origin, destination);
    
    res.status(200).json({
      success: true,
      data: trafficData
    });
  } catch (error) {
    console.error('Error getting route traffic data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get route traffic data',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
}

/**
 * Compare route optimization algorithms
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function compareAlgorithms(req, res) {
  try {
    const { deliveryPoints, startPoint } = req.body;
    
    if (!deliveryPoints || !Array.isArray(deliveryPoints) || deliveryPoints.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Delivery points are required and must be a non-empty array'
      });
    }
    
    if (!startPoint || !startPoint.lat || !startPoint.lng) {
      return res.status(400).json({
        success: false,
        message: 'Start point with lat/lng coordinates is required'
      });
    }
    
    // Track API call
    incrementApiCallCounter('algorithmComparison');
    
    // Process delivery points (geocode addresses if needed)
    const processedPoints = await Promise.all(deliveryPoints.map(async point => {
      // If point has address but no coordinates, geocode it
      if (point.address && (!point.lat || !point.lng)) {
        const geocoded = await geocodeAddress(point.address);
        return {
          ...point,
          lat: geocoded.lat,
          lng: geocoded.lng,
          formattedAddress: geocoded.formattedAddress
        };
      }
      return point;
    }));
    
    // Run both algorithms
    const startTime1 = Date.now();
    const dijkstraRoute = await findOptimalRoute(processedPoints, startPoint);
    const dijkstraTime = Date.now() - startTime1;
    const dijkstraMetrics = await calculateRouteMetrics(dijkstraRoute);
    
    const startTime2 = Date.now();
    const tspRoute = await findOptimalRouteTSP(processedPoints, startPoint);
    const tspTime = Date.now() - startTime2;
    const tspMetrics = await calculateTSPRouteMetrics(tspRoute);
    
    // Compare results
    const comparison = {
      dijkstra: {
        route: dijkstraRoute,
        metrics: dijkstraMetrics,
        computationTimeMs: dijkstraTime
      },
      tsp: {
        route: tspRoute,
        metrics: tspMetrics,
        computationTimeMs: tspTime
      },
      comparison: {
        distanceDifference: Math.abs(dijkstraMetrics.totalDistance - tspMetrics.totalDistance),
        timeDifference: Math.abs(dijkstraMetrics.totalTime - tspMetrics.totalTime),
        computationTimeDifference: Math.abs(dijkstraTime - tspTime),
        recommended: tspMetrics.totalDistance <= dijkstraMetrics.totalDistance ? 'tsp' : 'dijkstra'
      }
    };
    
    res.status(200).json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error('Error comparing algorithms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compare algorithms',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
}

/**
 * Simulate fuel savings with optimized routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function simulateFuelSavings(req, res) {
  try {
    const { deliveryPoints, startPoint, fuelCostPerLiter = 1.5, vehicleConsumptionLPer100Km = 10 } = req.body;
    
    if (!deliveryPoints || !Array.isArray(deliveryPoints) || deliveryPoints.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Delivery points are required and must be a non-empty array'
      });
    }
    
    if (!startPoint || !startPoint.lat || !startPoint.lng) {
      return res.status(400).json({
        success: false,
        message: 'Start point with lat/lng coordinates is required'
      });
    }
    
    // Track API call
    incrementApiCallCounter('fuelSimulation');
    
    // Process delivery points (geocode addresses if needed)
    const processedPoints = await Promise.all(deliveryPoints.map(async point => {
      // If point has address but no coordinates, geocode it
      if (point.address && (!point.lat || !point.lng)) {
        const geocoded = await geocodeAddress(point.address);
        return {
          ...point,
          lat: geocoded.lat,
          lng: geocoded.lng,
          formattedAddress: geocoded.formattedAddress
        };
      }
      return point;
    }));
    
    // Generate a non-optimized route (just visit points in the order they were provided)
    const nonOptimizedRoute = [startPoint, ...processedPoints];
    const nonOptimizedMetrics = await calculateRouteMetrics(nonOptimizedRoute);
    
    // Generate optimized route using TSP (usually better for fuel savings)
    const optimizedRoute = await findOptimalRouteTSP(processedPoints, startPoint);
    const optimizedMetrics = await calculateTSPRouteMetrics(optimizedRoute);
    
    // Calculate fuel consumption and costs
    const nonOptimizedFuelConsumption = (nonOptimizedMetrics.totalDistance * vehicleConsumptionLPer100Km) / 100;
    const optimizedFuelConsumption = (optimizedMetrics.totalDistance * vehicleConsumptionLPer100Km) / 100;
    
    const nonOptimizedFuelCost = nonOptimizedFuelConsumption * fuelCostPerLiter;
    const optimizedFuelCost = optimizedFuelConsumption * fuelCostPerLiter;
    
    const fuelSavingsLiters = nonOptimizedFuelConsumption - optimizedFuelConsumption;
    const fuelSavingsCost = nonOptimizedFuelCost - optimizedFuelCost;
    const fuelSavingsPercentage = (fuelSavingsLiters / nonOptimizedFuelConsumption) * 100;
    
    // Simulate for a month (assuming 20 working days)
    const monthlySavingsLiters = fuelSavingsLiters * 20;
    const monthlySavingsCost = fuelSavingsCost * 20;
    
    // Simulate for a year
    const yearlySavingsLiters = monthlySavingsLiters * 12;
    const yearlySavingsCost = monthlySavingsCost * 12;
    
    const simulation = {
      nonOptimized: {
        route: nonOptimizedRoute,
        metrics: nonOptimizedMetrics,
        fuelConsumptionLiters: nonOptimizedFuelConsumption.toFixed(2),
        fuelCost: nonOptimizedFuelCost.toFixed(2)
      },
      optimized: {
        route: optimizedRoute,
        metrics: optimizedMetrics,
        fuelConsumptionLiters: optimizedFuelConsumption.toFixed(2),
        fuelCost: optimizedFuelCost.toFixed(2)
      },
      savings: {
        distanceSavingsKm: (nonOptimizedMetrics.totalDistance - optimizedMetrics.totalDistance).toFixed(2),
        timeSavingsMinutes: (nonOptimizedMetrics.totalTime - optimizedMetrics.totalTime).toFixed(2),
        fuelSavingsLiters: fuelSavingsLiters.toFixed(2),
        fuelSavingsCost: fuelSavingsCost.toFixed(2),
        fuelSavingsPercentage: fuelSavingsPercentage.toFixed(2),
        monthlySavingsLiters: monthlySavingsLiters.toFixed(2),
        monthlySavingsCost: monthlySavingsCost.toFixed(2),
        yearlySavingsLiters: yearlySavingsLiters.toFixed(2),
        yearlySavingsCost: yearlySavingsCost.toFixed(2)
      }
    };
    
    res.status(200).json({
      success: true,
      data: simulation
    });
  } catch (error) {
    console.error('Error simulating fuel savings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to simulate fuel savings',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
}

module.exports = {
  optimizeRoute,
  reoptimizeCurrentRoute,
  getRouteTrafficData,
  compareAlgorithms,
  simulateFuelSavings
};