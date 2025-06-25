/**
 * Dijkstra's Algorithm for Route Optimization
 * 
 * This implementation finds the shortest path between delivery points
 * considering real-time traffic data from Google Maps API.
 */

const { getDistanceMatrix } = require('../services/googleMaps');

/**
 * Implements Dijkstra's algorithm to find the shortest path between delivery points
 * @param {Array} points - Array of delivery points with coordinates
 * @param {Object} startPoint - Starting point (usually the warehouse/hub)
 * @returns {Array} - Optimized sequence of delivery points
 */
async function findOptimalRoute(points, startPoint) {
  try {
    // Include the start point at the beginning
    const allPoints = [startPoint, ...points];
    
    // Get distance matrix from Google Maps API
    const distanceMatrix = await getDistanceMatrix(allPoints);
    
    // Initialize data structures
    const visited = new Array(allPoints.length).fill(false);
    const distances = new Array(allPoints.length).fill(Infinity);
    const previous = new Array(allPoints.length).fill(null);
    const path = [];
    
    // Start from the warehouse/hub (index 0)
    distances[0] = 0;
    visited[0] = true;
    path.push(0);
    
    let currentPoint = 0;
    
    // Find the shortest path for all points
    while (path.length < allPoints.length) {
      // Update distances from current point to all unvisited points
      for (let i = 0; i < allPoints.length; i++) {
        if (!visited[i] && distanceMatrix[currentPoint][i] < distances[i]) {
          distances[i] = distanceMatrix[currentPoint][i];
          previous[i] = currentPoint;
        }
      }
      
      // Find the unvisited point with the minimum distance
      let minDistance = Infinity;
      let nextPoint = -1;
      
      for (let i = 0; i < allPoints.length; i++) {
        if (!visited[i] && distances[i] < minDistance) {
          minDistance = distances[i];
          nextPoint = i;
        }
      }
      
      // If no reachable unvisited point is found, break
      if (nextPoint === -1) break;
      
      // Mark the next point as visited and add to path
      visited[nextPoint] = true;
      path.push(nextPoint);
      currentPoint = nextPoint;
    }
    
    // Convert indices to actual points
    return path.map(index => allPoints[index]);
  } catch (error) {
    console.error('Error in route optimization:', error);
    throw new Error('Failed to optimize route');
  }
}

/**
 * Calculate total distance and estimated time for a route
 * @param {Array} route - Optimized sequence of delivery points
 * @returns {Object} - Total distance and estimated time
 */
async function calculateRouteMetrics(route) {
  try {
    const distanceMatrix = await getDistanceMatrix(route);
    
    let totalDistance = 0;
    let totalTime = 0;
    
    for (let i = 0; i < route.length - 1; i++) {
      totalDistance += distanceMatrix[i][i + 1].distance.value; // in meters
      totalTime += distanceMatrix[i][i + 1].duration.value; // in seconds
    }
    
    return {
      totalDistance: totalDistance / 1000, // Convert to kilometers
      totalTime: totalTime / 60, // Convert to minutes
    };
  } catch (error) {
    console.error('Error calculating route metrics:', error);
    throw new Error('Failed to calculate route metrics');
  }
}

/**
 * Reoptimize route based on real-time traffic updates
 * @param {Array} currentRoute - Current route being followed
 * @param {Number} currentPointIndex - Index of the current point in the route
 * @returns {Array} - Reoptimized route from current point
 */
async function reoptimizeRoute(currentRoute, currentPointIndex) {
  try {
    // Get remaining points in the route
    const remainingPoints = currentRoute.slice(currentPointIndex);
    
    // Reoptimize using the current point as the start point
    const reoptimizedRemainingRoute = await findOptimalRoute(
      remainingPoints.slice(1), // Exclude the current point from points to visit
      remainingPoints[0] // Current point is the new start point
    );
    
    // Combine completed part of the route with reoptimized remaining part
    return [...currentRoute.slice(0, currentPointIndex), ...reoptimizedRemainingRoute];
  } catch (error) {
    console.error('Error reoptimizing route:', error);
    throw new Error('Failed to reoptimize route');
  }
}

module.exports = {
  findOptimalRoute,
  calculateRouteMetrics,
  reoptimizeRoute
};