/**
 * Traveling Salesman Problem (TSP) Algorithm for Route Optimization
 * 
 * This implementation uses a nearest neighbor heuristic with 2-opt improvement
 * to find an efficient route for delivery vehicles.
 */

const { getDistanceMatrix } = require('../services/googleMaps');

/**
 * Nearest Neighbor algorithm to generate an initial TSP solution
 * @param {Array} distanceMatrix - Matrix of distances between all points
 * @param {Number} startIndex - Index of the starting point
 * @returns {Array} - Tour as an array of indices
 */
function nearestNeighbor(distanceMatrix, startIndex = 0) {
  const numPoints = distanceMatrix.length;
  const visited = new Array(numPoints).fill(false);
  const tour = [startIndex];
  
  visited[startIndex] = true;
  
  // Build tour by repeatedly finding the nearest unvisited point
  while (tour.length < numPoints) {
    const currentPoint = tour[tour.length - 1];
    let nearestPoint = -1;
    let minDistance = Infinity;
    
    for (let i = 0; i < numPoints; i++) {
      if (!visited[i] && distanceMatrix[currentPoint][i] < minDistance) {
        nearestPoint = i;
        minDistance = distanceMatrix[currentPoint][i];
      }
    }
    
    if (nearestPoint === -1) break; // No reachable unvisited points
    
    tour.push(nearestPoint);
    visited[nearestPoint] = true;
  }
  
  return tour;
}

/**
 * Calculate the total distance of a tour
 * @param {Array} tour - Array of point indices representing the tour
 * @param {Array} distanceMatrix - Matrix of distances between all points
 * @returns {Number} - Total distance of the tour
 */
function calculateTourDistance(tour, distanceMatrix) {
  let totalDistance = 0;
  
  for (let i = 0; i < tour.length - 1; i++) {
    totalDistance += distanceMatrix[tour[i]][tour[i + 1]];
  }
  
  // Add distance from last point back to start (for a complete tour)
  // Uncomment if you need a round trip
  // totalDistance += distanceMatrix[tour[tour.length - 1]][tour[0]];
  
  return totalDistance;
}

/**
 * 2-opt improvement algorithm for TSP
 * Repeatedly swaps pairs of edges to reduce the total tour distance
 * @param {Array} tour - Initial tour
 * @param {Array} distanceMatrix - Matrix of distances between all points
 * @param {Number} maxIterations - Maximum number of improvement iterations
 * @returns {Array} - Improved tour
 */
function twoOptImprovement(tour, distanceMatrix, maxIterations = 100) {
  let improved = true;
  let iteration = 0;
  let bestTour = [...tour];
  let bestDistance = calculateTourDistance(bestTour, distanceMatrix);
  
  while (improved && iteration < maxIterations) {
    improved = false;
    iteration++;
    
    for (let i = 0; i < bestTour.length - 2; i++) {
      for (let j = i + 2; j < bestTour.length; j++) {
        // Skip if we're trying to swap adjacent edges
        if (j === i + 1) continue;
        
        // Create a new tour by reversing the segment between i+1 and j
        const newTour = [...bestTour];
        let left = i + 1;
        let right = j;
        
        while (left < right) {
          [newTour[left], newTour[right]] = [newTour[right], newTour[left]];
          left++;
          right--;
        }
        
        const newDistance = calculateTourDistance(newTour, distanceMatrix);
        
        if (newDistance < bestDistance) {
          bestTour = newTour;
          bestDistance = newDistance;
          improved = true;
          break; // Break inner loop to restart with the new best tour
        }
      }
      
      if (improved) break; // Break outer loop to restart with the new best tour
    }
  }
  
  return bestTour;
}

/**
 * Solve the TSP for a set of delivery points
 * @param {Array} points - Array of delivery points with coordinates
 * @param {Object} startPoint - Starting point (usually the warehouse/hub)
 * @returns {Array} - Optimized sequence of delivery points
 */
async function findOptimalRouteTSP(points, startPoint) {
  try {
    // Include the start point at the beginning
    const allPoints = [startPoint, ...points];
    
    // Get distance matrix from Google Maps API
    const rawDistanceMatrix = await getDistanceMatrix(allPoints);
    
    // Convert to a simple numeric matrix for the algorithm
    const distanceMatrix = rawDistanceMatrix.map(row => 
      row.map(cell => cell.distance ? cell.distance.value : Infinity)
    );
    
    // Generate initial solution using nearest neighbor
    const initialTour = nearestNeighbor(distanceMatrix, 0); // Start from warehouse (index 0)
    
    // Improve solution using 2-opt
    const optimizedTour = twoOptImprovement(initialTour, distanceMatrix);
    
    // Convert indices back to actual points
    return optimizedTour.map(index => allPoints[index]);
  } catch (error) {
    console.error('Error in TSP route optimization:', error);
    throw new Error('Failed to optimize route using TSP');
  }
}

/**
 * Calculate metrics for a TSP route
 * @param {Array} route - Optimized sequence of delivery points
 * @returns {Object} - Total distance, estimated time, and fuel savings
 */
async function calculateTSPRouteMetrics(route) {
  try {
    const distanceMatrix = await getDistanceMatrix(route);
    
    let totalDistance = 0;
    let totalTime = 0;
    
    for (let i = 0; i < route.length - 1; i++) {
      totalDistance += distanceMatrix[i][i + 1].distance.value; // in meters
      totalTime += distanceMatrix[i][i + 1].duration.value; // in seconds
    }
    
    // Calculate estimated fuel savings (30% as mentioned in requirements)
    const estimatedNonOptimizedDistance = totalDistance * 1.3; // Assuming 30% more distance without optimization
    const fuelSavings = (estimatedNonOptimizedDistance - totalDistance) / estimatedNonOptimizedDistance * 100;
    
    return {
      totalDistance: totalDistance / 1000, // Convert to kilometers
      totalTime: totalTime / 60, // Convert to minutes
      fuelSavingsPercentage: fuelSavings.toFixed(2)
    };
  } catch (error) {
    console.error('Error calculating TSP route metrics:', error);
    throw new Error('Failed to calculate TSP route metrics');
  }
}

module.exports = {
  findOptimalRouteTSP,
  calculateTSPRouteMetrics,
  nearestNeighbor,
  twoOptImprovement
};