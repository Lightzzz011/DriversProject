/**
 * Cache Utility
 * 
 * Provides caching functionality with expiry for API responses
 * to reduce API calls and improve performance.
 */

/**
 * Simple in-memory cache with expiry
 */
class CacheWithExpiry {
  constructor() {
    this.cache = new Map();
  }
  
  /**
   * Set a value in the cache with expiry
   * @param {String} key - Cache key
   * @param {*} value - Value to cache
   * @param {Number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl) {
    const now = Date.now();
    const item = {
      value,
      expiry: now + ttl
    };
    
    this.cache.set(key, item);
    
    // Schedule cleanup after TTL
    setTimeout(() => {
      this.delete(key);
    }, ttl);
  }
  
  /**
   * Get a value from the cache
   * @param {String} key - Cache key
   * @returns {*} - Cached value or undefined if not found or expired
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) return undefined;
    
    const now = Date.now();
    
    if (now > item.expiry) {
      this.delete(key);
      return undefined;
    }
    
    return item.value;
  }
  
  /**
   * Delete a value from the cache
   * @param {String} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
  }
  
  /**
   * Clear the entire cache
   */
  clear() {
    this.cache.clear();
  }
  
  /**
   * Get the size of the cache
   * @returns {Number} - Number of items in the cache
   */
  size() {
    return this.cache.size;
  }
  
  /**
   * Get all keys in the cache
   * @returns {Array} - Array of cache keys
   */
  keys() {
    return Array.from(this.cache.keys());
  }
  
  /**
   * Check if a key exists in the cache and is not expired
   * @param {String} key - Cache key
   * @returns {Boolean} - Whether the key exists and is not expired
   */
  has(key) {
    const item = this.cache.get(key);
    
    if (!item) return false;
    
    const now = Date.now();
    
    if (now > item.expiry) {
      this.delete(key);
      return false;
    }
    
    return true;
  }
}

// Create a singleton instance
const cacheWithExpiry = new CacheWithExpiry();

/**
 * Cache a function call with expiry
 * @param {Function} fn - Function to cache
 * @param {Number} ttl - Time to live in milliseconds
 * @returns {Function} - Cached function
 */
function cachify(fn, ttl = 15 * 60 * 1000) { // Default 15 minutes
  return async function(...args) {
    const key = `${fn.name}_${JSON.stringify(args)}`;
    
    if (cacheWithExpiry.has(key)) {
      return cacheWithExpiry.get(key);
    }
    
    const result = await fn(...args);
    cacheWithExpiry.set(key, result, ttl);
    
    return result;
  };
}

module.exports = {
  cacheWithExpiry,
  cachify
};