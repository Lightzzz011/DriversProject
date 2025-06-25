/**
 * Driver Controller
 * 
 * Handles API endpoints for driver operations
 */

const admin = require('firebase-admin');
const {
  getDriverOrders,
  updateDriverLocation,
  getDriverLocationHistory
} = require('../services/firebase');

/**
 * Get all orders assigned to a driver
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getDriverAssignedOrders(req, res) {
  try {
    const { driverId } = req.params;
    
    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: 'Driver ID is required'
      });
    }
    
    const orders = await getDriverOrders(driverId);
    
    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error getting driver orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get driver orders',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
}

/**
 * Update driver's current location
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateLocation(req, res) {
  try {
    const { driverId } = req.params;
    const { lat, lng, speed, heading } = req.body;
    
    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: 'Driver ID is required'
      });
    }
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }
    
    const locationData = {
      lat,
      lng,
      speed: speed || 0,
      heading: heading || 0,
      timestamp: new Date().toISOString()
    };
    
    await updateDriverLocation(driverId, locationData);
    
    res.status(200).json({
      success: true,
      data: locationData
    });
  } catch (error) {
    console.error('Error updating driver location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update driver location',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
}

/**
 * Get driver's location history
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getLocationHistory(req, res) {
  try {
    const { driverId } = req.params;
    const { hours } = req.query;
    
    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: 'Driver ID is required'
      });
    }
    
    const locationHistory = await getDriverLocationHistory(
      driverId,
      hours ? parseInt(hours) : 24
    );
    
    res.status(200).json({
      success: true,
      data: locationHistory
    });
  } catch (error) {
    console.error('Error getting driver location history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get driver location history',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
}

/**
 * Update driver's availability status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateAvailability(req, res) {
  try {
    const { driverId } = req.params;
    const { isAvailable } = req.body;
    
    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: 'Driver ID is required'
      });
    }
    
    if (isAvailable === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Availability status is required'
      });
    }
    
    const db = admin.firestore();
    await db.collection('drivers').doc(driverId).update({
      isAvailable: Boolean(isAvailable),
      lastStatusUpdate: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.status(200).json({
      success: true,
      data: {
        driverId,
        isAvailable: Boolean(isAvailable)
      }
    });
  } catch (error) {
    console.error('Error updating driver availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update driver availability',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
}

/**
 * Get all available drivers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAvailableDrivers(req, res) {
  try {
    const { lat, lng, radius } = req.query;
    
    const db = admin.firestore();
    let query = db.collection('drivers').where('isAvailable', '==', true);
    
    const driversSnapshot = await query.get();
    
    let drivers = [];
    
    driversSnapshot.forEach(doc => {
      drivers.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // If location and radius provided, filter by distance
    if (lat && lng && radius) {
      const center = { lat: parseFloat(lat), lng: parseFloat(lng) };
      const radiusKm = parseFloat(radius);
      
      // Filter drivers by distance
      drivers = drivers.filter(driver => {
        if (!driver.currentLocation) return false;
        
        // Calculate distance using Haversine formula
        const distance = calculateDistance(
          center.lat,
          center.lng,
          driver.currentLocation.lat,
          driver.currentLocation.lng
        );
        
        // Add distance to driver object
        driver.distanceKm = distance;
        
        return distance <= radiusKm;
      });
      
      // Sort by distance
      drivers.sort((a, b) => a.distanceKm - b.distanceKm);
    }
    
    // Remove sensitive information
    drivers = drivers.map(driver => ({
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      currentLocation: driver.currentLocation,
      distanceKm: driver.distanceKm,
      isAvailable: driver.isAvailable,
      lastOnline: driver.lastOnline,
      vehicleType: driver.vehicleType,
      rating: driver.rating
    }));
    
    res.status(200).json({
      success: true,
      data: drivers
    });
  } catch (error) {
    console.error('Error getting available drivers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available drivers',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
}

/**
 * Calculate distance between two points using Haversine formula
 * @param {Number} lat1 - Latitude of point 1
 * @param {Number} lon1 - Longitude of point 1
 * @param {Number} lat2 - Latitude of point 2
 * @param {Number} lon2 - Longitude of point 2
 * @returns {Number} - Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
}

/**
 * Convert degrees to radians
 * @param {Number} deg - Degrees
 * @returns {Number} - Radians
 */
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Get driver performance metrics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getDriverPerformance(req, res) {
  try {
    const { driverId } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: 'Driver ID is required'
      });
    }
    
    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Get driver's orders in date range
    const db = admin.firestore();
    const ordersSnapshot = await db.collection('deliveryOrders')
      .where('driverId', '==', driverId)
      .where('createdAt', '>=', start)
      .where('createdAt', '<=', end)
      .get();
    
    const orders = [];
    ordersSnapshot.forEach(doc => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Calculate metrics
    const totalOrders = orders.length;
    const completedOrders = orders.filter(order => order.status === 'delivered').length;
    const cancelledOrders = orders.filter(order => order.status === 'cancelled').length;
    
    // Calculate average delivery time
    let totalDeliveryTime = 0;
    let ordersWithDeliveryTime = 0;
    
    orders.forEach(order => {
      if (order.status === 'delivered' && order.deliveredAt && order.assignedAt) {
        const deliveryTime = new Date(order.deliveredAt).getTime() - new Date(order.assignedAt).getTime();
        totalDeliveryTime += deliveryTime;
        ordersWithDeliveryTime++;
      }
    });
    
    const averageDeliveryTimeMs = ordersWithDeliveryTime > 0 ? totalDeliveryTime / ordersWithDeliveryTime : 0;
    const averageDeliveryTimeMinutes = Math.round(averageDeliveryTimeMs / (60 * 1000));
    
    // Calculate on-time delivery rate
    let onTimeDeliveries = 0;
    let ordersWithExpectedTime = 0;
    
    orders.forEach(order => {
      if (order.status === 'delivered' && order.deliveredAt && order.expectedDeliveryTime) {
        ordersWithExpectedTime++;
        const deliveredAt = new Date(order.deliveredAt).getTime();
        const expectedAt = new Date(order.expectedDeliveryTime).getTime();
        
        if (deliveredAt <= expectedAt) {
          onTimeDeliveries++;
        }
      }
    });
    
    const onTimeDeliveryRate = ordersWithExpectedTime > 0 ? (onTimeDeliveries / ordersWithExpectedTime) * 100 : 0;
    
    // Get driver's ratings
    const ratingsSnapshot = await db.collection('driverRatings')
      .where('driverId', '==', driverId)
      .where('createdAt', '>=', start)
      .where('createdAt', '<=', end)
      .get();
    
    const ratings = [];
    ratingsSnapshot.forEach(doc => {
      ratings.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    const averageRating = ratings.length > 0 ?
      ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length :
      0;
    
    // Prepare metrics response
    const metrics = {
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        daysCount: Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
      },
      orders: {
        total: totalOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
        ordersPerDay: totalOrders / Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))
      },
      performance: {
        averageDeliveryTimeMinutes,
        onTimeDeliveryRate: onTimeDeliveryRate.toFixed(2),
        averageRating: averageRating.toFixed(1),
        totalRatings: ratings.length
      }
    };
    
    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error getting driver performance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get driver performance',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
}

module.exports = {
  getDriverAssignedOrders,
  updateLocation,
  getLocationHistory,
  updateAvailability,
  getAvailableDrivers,
  getDriverPerformance
};
