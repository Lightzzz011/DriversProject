/**
 * Geographic utility functions for distance calculations and location processing
 */

/**
 * Calculate the distance between two points using the Haversine formula
 * @param {number} lat1 - Latitude of point 1 in degrees
 * @param {number} lon1 - Longitude of point 1 in degrees
 * @param {number} lat2 - Latitude of point 2 in degrees
 * @param {number} lon2 - Longitude of point 2 in degrees
 * @returns {number} Distance in kilometers
 */
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  // Convert latitude and longitude from degrees to radians
  const toRadians = (degrees) => degrees * (Math.PI / 180);
  
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  // Haversine formula
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Earth's radius in kilometers
  const R = 6371;
  
  // Calculate the distance
  return R * c;
};

/**
 * Calculate the bearing between two points
 * @param {number} lat1 - Latitude of point 1 in degrees
 * @param {number} lon1 - Longitude of point 1 in degrees
 * @param {number} lat2 - Latitude of point 2 in degrees
 * @param {number} lon2 - Longitude of point 2 in degrees
 * @returns {number} Bearing in degrees (0-360)
 */
const calculateBearing = (lat1, lon1, lat2, lon2) => {
  // Convert latitude and longitude from degrees to radians
  const toRadians = (degrees) => degrees * (Math.PI / 180);
  const toDegrees = (radians) => radians * (180 / Math.PI);
  
  const startLat = toRadians(lat1);
  const startLng = toRadians(lon1);
  const destLat = toRadians(lat2);
  const destLng = toRadians(lon2);
  
  const y = Math.sin(destLng - startLng) * Math.cos(destLat);
  const x = Math.cos(startLat) * Math.sin(destLat) -
            Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
  
  let bearing = toDegrees(Math.atan2(y, x));
  bearing = (bearing + 360) % 360; // Normalize to 0-360
  
  return bearing;
};

/**
 * Check if a point is within a specified radius of another point
 * @param {Object} point - The point to check {lat, lng}
 * @param {Object} center - The center point {lat, lng}
 * @param {number} radiusKm - The radius in kilometers
 * @returns {boolean} True if the point is within the radius
 */
const isPointWithinRadius = (point, center, radiusKm) => {
  const distance = calculateHaversineDistance(
    point.lat, point.lng,
    center.lat, center.lng
  );
  
  return distance <= radiusKm;
};

/**
 * Find the nearest point from a list of points to a reference point
 * @param {Object} referencePoint - The reference point {lat, lng}
 * @param {Array} points - Array of points [{lat, lng, ...}]
 * @returns {Object} The nearest point with distance added
 */
const findNearestPoint = (referencePoint, points) => {
  if (!points || points.length === 0) {
    return null;
  }
  
  let nearestPoint = null;
  let minDistance = Infinity;
  
  points.forEach(point => {
    const distance = calculateHaversineDistance(
      referencePoint.lat, referencePoint.lng,
      point.lat, point.lng
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestPoint = { ...point, distance };
    }
  });
  
  return nearestPoint;
};

/**
 * Sort points by distance from a reference point
 * @param {Object} referencePoint - The reference point {lat, lng}
 * @param {Array} points - Array of points [{lat, lng, ...}]
 * @returns {Array} Sorted array of points with distances added
 */
const sortPointsByDistance = (referencePoint, points) => {
  if (!points || points.length === 0) {
    return [];
  }
  
  // Calculate distance for each point
  const pointsWithDistance = points.map(point => {
    const distance = calculateHaversineDistance(
      referencePoint.lat, referencePoint.lng,
      point.lat, point.lng
    );
    
    return { ...point, distance };
  });
  
  // Sort by distance
  return pointsWithDistance.sort((a, b) => a.distance - b.distance);
};

/**
 * Calculate the center point (centroid) of multiple points
 * @param {Array} points - Array of points [{lat, lng, ...}]
 * @returns {Object} The center point {lat, lng}
 */
const calculateCentroid = (points) => {
  if (!points || points.length === 0) {
    return null;
  }
  
  let sumLat = 0;
  let sumLng = 0;
  
  points.forEach(point => {
    sumLat += point.lat;
    sumLng += point.lng;
  });
  
  return {
    lat: sumLat / points.length,
    lng: sumLng / points.length
  };
};

/**
 * Calculate the bounding box for a set of points
 * @param {Array} points - Array of points [{lat, lng, ...}]
 * @returns {Object} Bounding box {north, south, east, west}
 */
const calculateBoundingBox = (points) => {
  if (!points || points.length === 0) {
    return null;
  }
  
  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;
  
  points.forEach(point => {
    north = Math.max(north, point.lat);
    south = Math.min(south, point.lat);
    east = Math.max(east, point.lng);
    west = Math.min(west, point.lng);
  });
  
  return { north, south, east, west };
};

/**
 * Estimate travel time based on distance and average speed
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} avgSpeedKmh - Average speed in km/h
 * @returns {number} Estimated travel time in minutes
 */
const estimateTravelTime = (distanceKm, avgSpeedKmh = 30) => {
  // Convert to minutes: (distance / speed) * 60
  return (distanceKm / avgSpeedKmh) * 60;
};

/**
 * Estimate fuel consumption based on distance and vehicle type
 * @param {number} distanceKm - Distance in kilometers
 * @param {string} vehicleType - Type of vehicle ('car', 'van', 'truck')
 * @returns {number} Estimated fuel consumption in liters
 */
const estimateFuelConsumption = (distanceKm, vehicleType = 'van') => {
  // Average fuel efficiency in km/L for different vehicle types
  const fuelEfficiency = {
    car: 12, // 12 km/L
    van: 10, // 10 km/L
    truck: 6  // 6 km/L
  };
  
  const efficiency = fuelEfficiency[vehicleType] || fuelEfficiency.van;
  
  // Fuel consumption in liters
  return distanceKm / efficiency;
};

module.exports = {
  calculateHaversineDistance,
  calculateBearing,
  isPointWithinRadius,
  findNearestPoint,
  sortPointsByDistance,
  calculateCentroid,
  calculateBoundingBox,
  estimateTravelTime,
  estimateFuelConsumption
};