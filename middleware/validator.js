/**
 * Request validation middleware using Joi
 */

const Joi = require('joi');
const { createError } = require('./errorHandler');

/**
 * Create a validation middleware with a Joi schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Validation middleware
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const data = req[property];
    const { error, value } = schema.validate(data, { abortEarly: false });
    
    if (error) {
      const details = error.details.map(detail => ({
        message: detail.message,
        path: detail.path
      }));
      
      return next(createError('Validation error', 400, details));
    }
    
    // Replace the validated data
    req[property] = value;
    return next();
  };
};

/**
 * Validation schemas for route optimization endpoints
 */
const routeOptimizationSchemas = {
  optimize: Joi.object({
    algorithm: Joi.string().valid('dijkstra', 'tsp').required(),
    startPoint: Joi.object({
      lat: Joi.number().required(),
      lng: Joi.number().required(),
      address: Joi.string()
    }).required(),
    deliveryPoints: Joi.array().items(
      Joi.object({
        lat: Joi.number().required(),
        lng: Joi.number().required(),
        address: Joi.string(),
        orderId: Joi.string()
      })
    ).min(1).required(),
    considerTraffic: Joi.boolean().default(true),
    returnToStart: Joi.boolean().default(true),
    optimizeWaypoints: Joi.boolean().default(true)
  }),
  
  reoptimize: Joi.object({
    algorithm: Joi.string().valid('dijkstra', 'tsp').required(),
    currentPosition: Joi.object({
      lat: Joi.number().required(),
      lng: Joi.number().required()
    }).required(),
    remainingPoints: Joi.array().items(
      Joi.object({
        lat: Joi.number().required(),
        lng: Joi.number().required(),
        address: Joi.string(),
        orderId: Joi.string()
      })
    ).min(1).required(),
    endPoint: Joi.object({
      lat: Joi.number().required(),
      lng: Joi.number().required(),
      address: Joi.string()
    }).required(),
    considerTraffic: Joi.boolean().default(true)
  }),
  
  traffic: Joi.object({
    origin: Joi.object({
      lat: Joi.number().required(),
      lng: Joi.number().required()
    }).required(),
    destination: Joi.object({
      lat: Joi.number().required(),
      lng: Joi.number().required()
    }).required()
  }),
  
  compare: Joi.object({
    startPoint: Joi.object({
      lat: Joi.number().required(),
      lng: Joi.number().required(),
      address: Joi.string()
    }).required(),
    deliveryPoints: Joi.array().items(
      Joi.object({
        lat: Joi.number().required(),
        lng: Joi.number().required(),
        address: Joi.string(),
        orderId: Joi.string()
      })
    ).min(2).required(),
    considerTraffic: Joi.boolean().default(true),
    returnToStart: Joi.boolean().default(true)
  }),
  
  simulateFuelSavings: Joi.object({
    originalRoute: Joi.array().items(
      Joi.object({
        lat: Joi.number().required(),
        lng: Joi.number().required(),
        address: Joi.string()
      })
    ).min(2).required(),
    optimizedRoute: Joi.array().items(
      Joi.object({
        lat: Joi.number().required(),
        lng: Joi.number().required(),
        address: Joi.string()
      })
    ).min(2).required(),
    vehicleType: Joi.string().valid('car', 'van', 'truck').default('van'),
    fuelEfficiency: Joi.number().positive().default(10) // km/L
  })
};

/**
 * Validation schemas for delivery endpoints
 */
const deliverySchemas = {
  createOrder: Joi.object({
    customerId: Joi.string().required(),
    customerName: Joi.string().required(),
    customerPhone: Joi.string().required(),
    pickupAddress: Joi.object({
      address: Joi.string().required(),
      lat: Joi.number().required(),
      lng: Joi.number().required()
    }).required(),
    deliveryAddress: Joi.object({
      address: Joi.string().required(),
      lat: Joi.number().required(),
      lng: Joi.number().required()
    }).required(),
    items: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        quantity: Joi.number().integer().positive().required(),
        price: Joi.number().positive(),
        weight: Joi.number().positive(),
        dimensions: Joi.object({
          length: Joi.number().positive(),
          width: Joi.number().positive(),
          height: Joi.number().positive()
        })
      })
    ).min(1).required(),
    priority: Joi.string().valid('standard', 'express', 'priority').default('standard'),
    notes: Joi.string().allow('', null),
    scheduledDelivery: Joi.date().iso().allow(null)
  }),
  
  updateOrder: Joi.object({
    status: Joi.string().valid('pending', 'assigned', 'in-progress', 'delivered', 'cancelled').optional(),
    driverId: Joi.string().allow(null).optional(),
    deliveryAddress: Joi.object({
      address: Joi.string().required(),
      lat: Joi.number().required(),
      lng: Joi.number().required()
    }).optional(),
    items: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        quantity: Joi.number().integer().positive().required(),
        price: Joi.number().positive(),
        weight: Joi.number().positive()
      })
    ).optional(),
    priority: Joi.string().valid('standard', 'express', 'priority').optional(),
    notes: Joi.string().allow('', null).optional(),
    scheduledDelivery: Joi.date().iso().allow(null).optional()
  }).min(1),
  
  assignOrder: Joi.object({
    driverId: Joi.string().required()
  }),
  
  batchOptimize: Joi.object({
    orderIds: Joi.array().items(Joi.string()).min(1).required(),
    startPoint: Joi.object({
      lat: Joi.number().required(),
      lng: Joi.number().required(),
      address: Joi.string().required()
    }).required(),
    algorithm: Joi.string().valid('dijkstra', 'tsp').default('tsp'),
    considerTraffic: Joi.boolean().default(true),
    returnToStart: Joi.boolean().default(true)
  })
};

/**
 * Validation schemas for driver endpoints
 */
const driverSchemas = {
  updateLocation: Joi.object({
    location: Joi.object({
      lat: Joi.number().required(),
      lng: Joi.number().required(),
      accuracy: Joi.number().positive().optional(),
      speed: Joi.number().min(0).optional(),
      heading: Joi.number().min(0).max(360).optional(),
      timestamp: Joi.date().iso().default(() => new Date().toISOString())
    }).required()
  }),
  
  updateAvailability: Joi.object({
    status: Joi.string().valid('active', 'inactive', 'on-break').required(),
    reason: Joi.string().when('status', {
      is: 'inactive',
      then: Joi.string().required(),
      otherwise: Joi.string().allow('', null)
    })
  }),
  
  findAvailable: Joi.object({
    location: Joi.object({
      lat: Joi.number().required(),
      lng: Joi.number().required()
    }).required(),
    maxDistance: Joi.number().positive().default(10), // km
    limit: Joi.number().integer().positive().default(10)
  })
};

module.exports = {
  validate,
  routeOptimizationSchemas,
  deliverySchemas,
  driverSchemas
};