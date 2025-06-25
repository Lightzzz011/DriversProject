/**
 * Firebase Service
 * 
 * Handles interactions with Firebase for:
 * - Database operations
 * - Authentication
 * - Cloud Messaging for notifications
 * - Storage
 */

const admin = require('firebase-admin');
const { cacheWithExpiry } = require('../utils/cache');

// Cache settings
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Get Firestore database instance
 * @returns {FirebaseFirestore.Firestore} - Firestore instance
 */
function getFirestore() {
  return admin.firestore();
}

/**
 * Get Realtime Database instance
 * @returns {FirebaseDatabase.Database} - Realtime Database instance
 */
function getDatabase() {
  return admin.database();
}

/**
 * Get Firebase Storage instance
 * @returns {FirebaseStorage.Storage} - Storage instance
 */
function getStorage() {
  return admin.storage();
}

/**
 * Create a new delivery order in Firestore
 * @param {Object} orderData - Order data
 * @returns {String} - Order ID
 */
async function createDeliveryOrder(orderData) {
  try {
    const db = getFirestore();
    const ordersRef = db.collection('deliveryOrders');
    
    // Add timestamp
    const orderWithTimestamp = {
      ...orderData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: orderData.status || 'pending'
    };
    
    const docRef = await ordersRef.add(orderWithTimestamp);
    
    // Also add to realtime database for real-time updates
    const rtdb = getDatabase();
    await rtdb.ref(`deliveryOrders/${docRef.id}`).set({
      ...orderWithTimestamp,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating delivery order:', error);
    throw new Error('Failed to create delivery order');
  }
}

/**
 * Get a delivery order by ID
 * @param {String} orderId - Order ID
 * @returns {Object} - Order data
 */
async function getDeliveryOrder(orderId) {
  try {
    // Check cache first
    const cacheKey = `order_${orderId}`;
    const cachedOrder = cacheWithExpiry.get(cacheKey);
    
    if (cachedOrder) return cachedOrder;
    
    const db = getFirestore();
    const orderDoc = await db.collection('deliveryOrders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      throw new Error('Order not found');
    }
    
    const orderData = {
      id: orderDoc.id,
      ...orderDoc.data()
    };
    
    // Cache the result
    cacheWithExpiry.set(cacheKey, orderData, CACHE_EXPIRY);
    
    return orderData;
  } catch (error) {
    console.error('Error getting delivery order:', error);
    throw new Error('Failed to get delivery order');
  }
}

/**
 * Update a delivery order
 * @param {String} orderId - Order ID
 * @param {Object} updateData - Data to update
 * @returns {Boolean} - Success status
 */
async function updateDeliveryOrder(orderId, updateData) {
  try {
    const db = getFirestore();
    const rtdb = getDatabase();
    
    // Add timestamp
    const dataWithTimestamp = {
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Update in Firestore
    await db.collection('deliveryOrders').doc(orderId).update(dataWithTimestamp);
    
    // Update in Realtime Database
    await rtdb.ref(`deliveryOrders/${orderId}`).update({
      ...updateData,
      updatedAt: Date.now()
    });
    
    // Invalidate cache
    cacheWithExpiry.delete(`order_${orderId}`);
    
    return true;
  } catch (error) {
    console.error('Error updating delivery order:', error);
    throw new Error('Failed to update delivery order');
  }
}

/**
 * Get all delivery orders for a driver
 * @param {String} driverId - Driver ID
 * @returns {Array} - Array of order data
 */
async function getDriverOrders(driverId) {
  try {
    // Check cache first
    const cacheKey = `driver_orders_${driverId}`;
    const cachedOrders = cacheWithExpiry.get(cacheKey);
    
    if (cachedOrders) return cachedOrders;
    
    const db = getFirestore();
    const ordersSnapshot = await db.collection('deliveryOrders')
      .where('driverId', '==', driverId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const orders = [];
    
    ordersSnapshot.forEach(doc => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Cache the result
    cacheWithExpiry.set(cacheKey, orders, CACHE_EXPIRY);
    
    return orders;
  } catch (error) {
    console.error('Error getting driver orders:', error);
    throw new Error('Failed to get driver orders');
  }
}

/**
 * Get all pending delivery orders
 * @param {Number} limit - Maximum number of orders to return
 * @returns {Array} - Array of order data
 */
async function getPendingOrders(limit = 50) {
  try {
    // Check cache first
    const cacheKey = `pending_orders_${limit}`;
    const cachedOrders = cacheWithExpiry.get(cacheKey);
    
    if (cachedOrders) return cachedOrders;
    
    const db = getFirestore();
    const ordersSnapshot = await db.collection('deliveryOrders')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'asc')
      .limit(limit)
      .get();
    
    const orders = [];
    
    ordersSnapshot.forEach(doc => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Cache the result with shorter expiry for pending orders
    cacheWithExpiry.set(cacheKey, orders, CACHE_EXPIRY / 5); // 1 minute
    
    return orders;
  } catch (error) {
    console.error('Error getting pending orders:', error);
    throw new Error('Failed to get pending orders');
  }
}

/**
 * Assign a driver to an order
 * @param {String} orderId - Order ID
 * @param {String} driverId - Driver ID
 * @returns {Boolean} - Success status
 */
async function assignDriverToOrder(orderId, driverId) {
  try {
    const updateData = {
      driverId,
      status: 'assigned',
      assignedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await updateDeliveryOrder(orderId, updateData);
    
    // Invalidate relevant caches
    cacheWithExpiry.delete(`driver_orders_${driverId}`);
    cacheWithExpiry.delete(`order_${orderId}`);
    
    // Send notification to driver
    await sendDriverNotification(driverId, {
      title: 'New Delivery Assigned',
      body: `You have been assigned to delivery order ${orderId}`,
      data: { orderId }
    });
    
    return true;
  } catch (error) {
    console.error('Error assigning driver to order:', error);
    throw new Error('Failed to assign driver to order');
  }
}

/**
 * Send a notification to a driver
 * @param {String} driverId - Driver ID
 * @param {Object} notification - Notification data
 * @returns {Boolean} - Success status
 */
async function sendDriverNotification(driverId, notification) {
  try {
    const db = getFirestore();
    const driverDoc = await db.collection('drivers').doc(driverId).get();
    
    if (!driverDoc.exists) {
      throw new Error('Driver not found');
    }
    
    const driverData = driverDoc.data();
    const fcmToken = driverData.fcmToken;
    
    if (!fcmToken) {
      console.warn(`No FCM token found for driver ${driverId}`);
      return false;
    }
    
    const message = {
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data || {},
      token: fcmToken
    };
    
    await admin.messaging().send(message);
    
    // Log notification
    await db.collection('notifications').add({
      userId: driverId,
      userType: 'driver',
      ...notification,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false
    });
    
    return true;
  } catch (error) {
    console.error('Error sending driver notification:', error);
    throw new Error('Failed to send driver notification');
  }
}

/**
 * Get driver location history
 * @param {String} driverId - Driver ID
 * @param {Number} hours - Hours of history to retrieve
 * @returns {Array} - Array of location data
 */
async function getDriverLocationHistory(driverId, hours = 24) {
  try {
    const rtdb = getDatabase();
    const now = Date.now();
    const startTime = now - (hours * 60 * 60 * 1000);
    
    const locationSnapshot = await rtdb.ref(`driverLocations/${driverId}`)
      .orderByChild('timestamp')
      .startAt(startTime)
      .endAt(now)
      .once('value');
    
    const locations = [];
    
    locationSnapshot.forEach(childSnapshot => {
      locations.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });
    
    return locations;
  } catch (error) {
    console.error('Error getting driver location history:', error);
    throw new Error('Failed to get driver location history');
  }
}

/**
 * Update driver location
 * @param {String} driverId - Driver ID
 * @param {Object} location - Location data with lat/lng
 * @returns {Boolean} - Success status
 */
async function updateDriverLocation(driverId, location) {
  try {
    const rtdb = getDatabase();
    const locationData = {
      ...location,
      timestamp: admin.database.ServerValue.TIMESTAMP
    };
    
    // Update current location
    await rtdb.ref(`drivers/${driverId}/currentLocation`).set(locationData);
    
    // Add to location history
    const newLocationRef = rtdb.ref(`driverLocations/${driverId}`).push();
    await newLocationRef.set(locationData);
    
    return true;
  } catch (error) {
    console.error('Error updating driver location:', error);
    throw new Error('Failed to update driver location');
  }
}

/**
 * Get metrics for API calls and database usage
 * @returns {Object} - Metrics data
 */
async function getSystemMetrics() {
  try {
    const db = getFirestore();
    const metricsDoc = await db.collection('systemMetrics').doc('current').get();
    
    if (!metricsDoc.exists) {
      // Initialize metrics if they don't exist
      const initialMetrics = {
        apiCalls: {
          total: 0,
          googleMaps: 0,
          firebase: 0
        },
        activeDrivers: 0,
        pendingOrders: 0,
        completedOrders: 0,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await db.collection('systemMetrics').doc('current').set(initialMetrics);
      return initialMetrics;
    }
    
    return metricsDoc.data();
  } catch (error) {
    console.error('Error getting system metrics:', error);
    throw new Error('Failed to get system metrics');
  }
}

/**
 * Increment API call counter
 * @param {String} apiType - Type of API (googleMaps, firebase, etc.)
 * @returns {Boolean} - Success status
 */
async function incrementApiCallCounter(apiType) {
  try {
    const db = getFirestore();
    const metricsRef = db.collection('systemMetrics').doc('current');
    
    await db.runTransaction(async transaction => {
      const metricsDoc = await transaction.get(metricsRef);
      
      if (!metricsDoc.exists) {
        // Initialize metrics if they don't exist
        const initialMetrics = {
          apiCalls: {
            total: 1,
            [apiType]: 1
          },
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        };
        
        transaction.set(metricsRef, initialMetrics);
      } else {
        const data = metricsDoc.data();
        const apiCalls = data.apiCalls || {};
        
        transaction.update(metricsRef, {
          [`apiCalls.total`]: (apiCalls.total || 0) + 1,
          [`apiCalls.${apiType}`]: (apiCalls[apiType] || 0) + 1,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error incrementing API call counter:', error);
    // Don't throw here to prevent affecting the main functionality
    return false;
  }
}

module.exports = {
  getFirestore,
  getDatabase,
  getStorage,
  createDeliveryOrder,
  getDeliveryOrder,
  updateDeliveryOrder,
  getDriverOrders,
  getPendingOrders,
  assignDriverToOrder,
  sendDriverNotification,
  getDriverLocationHistory,
  updateDriverLocation,
  getSystemMetrics,
  incrementApiCallCounter
};