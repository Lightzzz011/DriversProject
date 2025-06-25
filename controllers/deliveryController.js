/**
 * Delivery Controller
 * 
 * Handles API endpoints for delivery operations
 */

const {
  createDeliveryOrder,
  getDeliveryOrder,
  updateDeliveryOrder,
  getPendingOrders,
  assignDriverToOrder
} = require('../services/firebase');
const { geocodeAddress } = require('../services/googleMaps');
const { findOptimalRouteTSP } = require('../algorithms/tsp');

/**
 * Create a new delivery order
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function createOrder(req, res) {
  try {
    const {
      customerId,
      customerName,
      customerPhone,
      pickupAddress,
      deliveryAddress,
      items,
      specialInstructions,
      expectedDeliveryTime
    } = req.body;
    
    // Validate required fields
    if (!customerId || !customerName || !customerPhone || !pickupAddress || !deliveryAddress || !items) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Geocode addresses
    const pickupGeocode = await geocodeAddress(pickupAddress);
    const deliveryGeocode = await geocodeAddress(deliveryAddress);
    
    // Create order object
    const orderData = {
      customerId,
      customerName,
      customerPhone,
      pickup: {
        address: pickupAddress,
        formattedAddress: pickupGeocode.formattedAddress,
        lat: pickupGeocode.lat,
        lng: pickupGeocode.lng
      },
      delivery: {
        address: deliveryAddress,
        formattedAddress: deliveryGeocode.formattedAddress,
        lat: deliveryGeocode.lat,
        lng: deliveryGeocode.lng
      },
      items,
      specialInstructions: specialInstructions || '',
      expectedDeliveryTime: expectedDeliveryTime || null,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    // Create order in database
    const orderId = await createDeliveryOrder(orderData);
    
    res.status(201).json({
      success: true,
      data: {
        orderId,
        order: {
          ...orderData,
          id: orderId
        }
      }
    });
  } catch (error) {
    console.error('Error creating delivery order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create delivery order',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
}

/**
 * Get a delivery order by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getOrder(req, res) {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }
    
    const order = await getDeliveryOrder(orderId);
    
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error getting delivery order:', error);
    res.status(error.message === 'Order not found' ? 404 : 500).json({
      success: false,
      message: error.message === 'Order not found' ? 'Order not found' : 'Failed to get delivery order',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
}

/**
 * Update a delivery order
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateOrder(req, res) {
  try {
    const { orderId } = req.params;
    const updateData = req.body;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No update data provided'
      });
    }
    
    // Geocode new addresses if provided
    if (updateData.pickupAddress) {
      const pickupGeocode = await geocodeAddress(updateData.pickupAddress);
      updateData.pickup = {
        address: updateData.pickupAddress,
        formattedAddress: pickupGeocode.formattedAddress,
        lat: pickupGeocode.lat,
        lng: pickupGeocode.lng
      };
      delete updateData.pickupAddress;
    }
    
    if (updateData.deliveryAddress) {
      const deliveryGeocode = await geocodeAddress(updateData.deliveryAddress);
      updateData.delivery = {
        address: updateData.deliveryAddress,
        formattedAddress: deliveryGeocode.formattedAddress,
        lat: deliveryGeocode.lat,
        lng: deliveryGeocode.lng
      };
      delete updateData.deliveryAddress;
    }
    
    // Update order in database
    await updateDeliveryOrder(orderId, updateData);
    
    // Get updated order
    const updatedOrder = await getDeliveryOrder(orderId);
    
    res.status(200).json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    console.error('Error updating delivery order:', error);
    res.status(error.message === 'Order not found' ? 404 : 500).json({
      success: false,
      message: error.message === 'Order not found' ? 'Order not found' : 'Failed to update delivery order',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
}

/**
 * Get pending delivery orders
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getPending(req, res) {
  try {
    const { limit } = req.query;
    
    const orders = await getPendingOrders(limit ? parseInt(limit) : 50);
    
    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error getting pending orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending orders',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
}

/**
 * Assign a driver to a delivery order
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function assignDriver(req, res) {
  try {
    const { orderId } = req.params;
    const { driverId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }
    
    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: 'Driver ID is required'
      });
    }
    
    await assignDriverToOrder(orderId, driverId);
    
    // Get updated order
    const updatedOrder = await getDeliveryOrder(orderId);
    
    res.status(200).json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    console.error('Error assigning driver to order:', error);
    res.status(error.message === 'Order not found' ? 404 : 500).json({
      success: false,
      message: error.message === 'Order not found' ? 'Order not found' : 'Failed to assign driver to order',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
}

/**
 * Batch optimize multiple delivery orders
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function batchOptimizeOrders(req, res) {
  try {
    const { orderIds, hubLocation } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order IDs are required and must be a non-empty array'
      });
    }
    
    if (!hubLocation || !hubLocation.lat || !hubLocation.lng) {
      return res.status(400).json({
        success: false,
        message: 'Hub location with lat/lng coordinates is required'
      });
    }
    
    // Get all orders
    const orders = await Promise.all(orderIds.map(id => getDeliveryOrder(id)));
    
    // Extract delivery points
    const deliveryPoints = orders.map(order => ({
      id: order.id,
      lat: order.delivery.lat,
      lng: order.delivery.lng,
      address: order.delivery.formattedAddress,
      customerName: order.customerName
    }));
    
    // Optimize route
    const optimizedRoute = await findOptimalRouteTSP(deliveryPoints, hubLocation);
    
    // Create optimized order sequence
    const optimizedOrderSequence = optimizedRoute.map(point => {
      const matchingOrder = orders.find(order => order.id === point.id);
      return matchingOrder ? matchingOrder.id : null;
    }).filter(id => id !== null);
    
    res.status(200).json({
      success: true,
      data: {
        optimizedOrderSequence,
        optimizedRoute
      }
    });
  } catch (error) {
    console.error('Error batch optimizing orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to batch optimize orders',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
}

/**
 * Get delivery metrics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getDeliveryMetrics(req, res) {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Query Firestore for orders in date range
    const db = require('firebase-admin').firestore();
    const ordersSnapshot = await db.collection('deliveryOrders')
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
    const pendingOrders = orders.filter(order => order.status === 'pending').length;
    const inProgressOrders = orders.filter(order => ['assigned', 'picked_up', 'in_transit'].includes(order.status)).length;
    const cancelledOrders = orders.filter(order => order.status === 'cancelled').length;
    
    // Calculate average delivery time (for completed orders)
    let totalDeliveryTime = 0;
    let ordersWithDeliveryTime = 0;
    
    orders.forEach(order => {
      if (order.status === 'delivered' && order.deliveredAt && order.createdAt) {
        const deliveryTime = new Date(order.deliveredAt).getTime() - new Date(order.createdAt).getTime();
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
        pending: pendingOrders,
        inProgress: inProgressOrders,
        cancelled: cancelledOrders,
        completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0
      },
      performance: {
        averageDeliveryTimeMinutes,
        onTimeDeliveryRate: onTimeDeliveryRate.toFixed(2),
        ordersPerDay: totalOrders / Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))
      }
    };
    
    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error getting delivery metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get delivery metrics',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
}

module.exports = {
  createOrder,
  getOrder,
  updateOrder,
  getPending,
  assignDriver,
  batchOptimizeOrders,
  getDeliveryMetrics
};