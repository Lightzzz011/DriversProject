/**
 * Google Maps API Service
 * 
 * Handles interactions with Google Maps API for:
 * - Distance Matrix calculations
 * - Geocoding
 * - Real-time traffic data
 * - Route directions
 */

const axios = require('axios');
const { cacheWithExpiry } = require('../utils/cache');

// Google Maps API Key from environment variables
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Cache settings
const CACHE_EXPIRY = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Get distance matrix between multiple points
 * @param {Array} points - Array of points with lat/lng properties
 * @param {Boolean} considerTraffic - Whether to consider real-time traffic
 * @returns {Array} - Matrix of distances and durations between points
 */
async function getDistanceMatrix(points, considerTraffic = true) {
  try {
    // Generate cache key based on points and traffic consideration
    const cacheKey = `distance_matrix_${JSON.stringify(points)}_${considerTraffic}`;
    
    // Check cache first
    const cachedResult = cacheWithExpiry.get(cacheKey);
    if (cachedResult) return cachedResult;
    
    // Format origins and destinations
    const locations = points.map(point => `${point.lat},${point.lng}`).join('|');
    
    // Set up request parameters
    const params = {
      origins: locations,
      destinations: locations,
      mode: 'driving',
      departure_time: considerTraffic ? 'now' : undefined,
      traffic_model: considerTraffic ? 'best_guess' : undefined,
      key: API_KEY
    };
    
    // Make API request
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/distancematrix/json',
      { params }
    );
    
    // Process response
    if (response.data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }
    
    // Format the distance matrix
    const matrix = [];
    const rows = response.data.rows;
    
    for (let i = 0; i < rows.length; i++) {
      const row = [];
      const elements = rows[i].elements;
      
      for (let j = 0; j < elements.length; j++) {
        const element = elements[j];
        
        if (element.status === 'OK') {
          row.push({
            distance: element.distance,
            duration: element.duration,
            duration_in_traffic: element.duration_in_traffic
          });
        } else {
          row.push(null); // Indicate unreachable point
        }
      }
      
      matrix.push(row);
    }
    
    // Cache the result
    cacheWithExpiry.set(cacheKey, matrix, CACHE_EXPIRY);
    
    return matrix;
  } catch (error) {
    console.error('Error getting distance matrix:', error);
    throw new Error('Failed to get distance matrix from Google Maps API');
  }
}

/**
 * Geocode an address to get coordinates
 * @param {String} address - Address to geocode
 * @returns {Object} - Coordinates (lat/lng) and formatted address
 */
async function geocodeAddress(address) {
  try {
    // Generate cache key
    const cacheKey = `geocode_${address}`;
    
    // Check cache first
    const cachedResult = cacheWithExpiry.get(cacheKey);
    if (cachedResult) return cachedResult;
    
    // Make API request
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      {
        params: {
          address,
          key: API_KEY
        }
      }
    );
    
    // Process response
    if (response.data.status !== 'OK') {
      throw new Error(`Geocoding error: ${response.data.status}`);
    }
    
    const result = response.data.results[0];
    const formattedResult = {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formattedAddress: result.formatted_address
    };
    
    // Cache the result
    cacheWithExpiry.set(cacheKey, formattedResult, CACHE_EXPIRY * 4); // Cache geocoding longer (1 hour)
    
    return formattedResult;
  } catch (error) {
    console.error('Error geocoding address:', error);
    throw new Error('Failed to geocode address using Google Maps API');
  }
}

/**
 * Get directions between two points
 * @param {Object} origin - Origin point with lat/lng
 * @param {Object} destination - Destination point with lat/lng
 * @param {Array} waypoints - Optional waypoints to include in the route
 * @returns {Object} - Route information including polyline, distance, duration
 */
async function getDirections(origin, destination, waypoints = []) {
  try {
    // Format origin, destination and waypoints
    const originStr = `${origin.lat},${origin.lng}`;
    const destinationStr = `${destination.lat},${destination.lng}`;
    const waypointsStr = waypoints.map(point => `${point.lat},${point.lng}`).join('|');
    
    // Generate cache key
    const cacheKey = `directions_${originStr}_${destinationStr}_${waypointsStr}`;
    
    // Check cache first
    const cachedResult = cacheWithExpiry.get(cacheKey);
    if (cachedResult) return cachedResult;
    
    // Set up request parameters
    const params = {
      origin: originStr,
      destination: destinationStr,
      waypoints: waypointsStr || undefined,
      mode: 'driving',
      departure_time: 'now',
      traffic_model: 'best_guess',
      alternatives: true,
      key: API_KEY
    };
    
    // Make API request
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/directions/json',
      { params }
    );
    
    // Process response
    if (response.data.status !== 'OK') {
      throw new Error(`Directions API error: ${response.data.status}`);
    }
    
    // Format the result
    const routes = response.data.routes.map(route => {
      const leg = route.legs[0]; // For simplicity, we're focusing on the first leg
      
      return {
        polyline: route.overview_polyline.points,
        distance: leg.distance,
        duration: leg.duration,
        duration_in_traffic: leg.duration_in_traffic,
        steps: leg.steps.map(step => ({
          instructions: step.html_instructions,
          distance: step.distance,
          duration: step.duration,
          polyline: step.polyline.points,
          start_location: step.start_location,
          end_location: step.end_location
        }))
      };
    });
    
    const result = {
      routes,
      bestRoute: routes[0] // Google returns routes sorted by preference
    };
    
    // Cache the result
    cacheWithExpiry.set(cacheKey, result, CACHE_EXPIRY);
    
    return result;
  } catch (error) {
    console.error('Error getting directions:', error);
    throw new Error('Failed to get directions from Google Maps API');
  }
}

/**
 * Get real-time traffic data for a route
 * @param {Object} origin - Origin point with lat/lng
 * @param {Object} destination - Destination point with lat/lng
 * @returns {Object} - Traffic information including congestion level
 */
async function getTrafficData(origin, destination) {
  try {
    // Get directions which includes traffic information
    const directions = await getDirections(origin, destination);
    
    // Extract traffic information
    const normalDuration = directions.bestRoute.duration.value; // in seconds
    const trafficDuration = directions.bestRoute.duration_in_traffic.value; // in seconds
    
    // Calculate congestion level (ratio of traffic duration to normal duration)
    const congestionRatio = trafficDuration / normalDuration;
    
    // Determine congestion level
    let congestionLevel;
    if (congestionRatio < 1.1) {
      congestionLevel = 'low';
    } else if (congestionRatio < 1.3) {
      congestionLevel = 'moderate';
    } else if (congestionRatio < 1.5) {
      congestionLevel = 'high';
    } else {
      congestionLevel = 'severe';
    }
    
    return {
      normalDuration,
      trafficDuration,
      congestionRatio,
      congestionLevel,
      delaySeconds: trafficDuration - normalDuration
    };
  } catch (error) {
    console.error('Error getting traffic data:', error);
    throw new Error('Failed to get traffic data');
  }
}

module.exports = {
  getDistanceMatrix,
  geocodeAddress,
  getDirections,
  getTrafficData
};