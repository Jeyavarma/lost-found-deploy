// Simple in-memory cache to replace Redis
// Avoids 30MB Redis memory limit issues

class SimpleCache {
  constructor(maxSize = 100, defaultTTL = 300) {
    this.cache = new Map();
    this.timers = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL; // seconds
  }

  async get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // Check if expired
    if (Date.now() > item.expires) {
      this.delete(key);
      return null;
    }
    
    return item.data;
  }

  async set(key, data, ttl = this.defaultTTL) {
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // If cache is full, remove oldest item
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.delete(firstKey);
    }

    const expires = Date.now() + (ttl * 1000);
    this.cache.set(key, { data, expires });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl * 1000);
    
    this.timers.set(key, timer);
  }

  delete(key) {
    this.cache.delete(key);
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }

  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.cache.clear();
    this.timers.clear();
  }

  size() {
    return this.cache.size;
  }

  // Clean up expired items
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.delete(key);
      }
    }
  }
}

// Create singleton instance
const cache = new SimpleCache(50, 300); // 50 items max, 5 minutes default TTL

// Clean up expired items every 5 minutes
setInterval(() => {
  cache.cleanup();
}, 5 * 60 * 1000);

// Redis-compatible interface
const connectRedis = async () => {
  console.log('✅ Using in-memory cache (Redis replacement)');
  return Promise.resolve();
};

const getCache = async (key) => {
  return cache.get(key);
};

const setCache = async (key, data, ttl = 300) => {
  return cache.set(key, data, ttl);
};

module.exports = { connectRedis, getCache, setCache };