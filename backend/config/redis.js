const redis = require('redis');

let client = null;

const connectRedis = async () => {
  try {
    client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    client.on('error', (err) => {
      console.log('Redis Client Error', err);
    });
    
    await client.connect();
    console.log('✅ Redis connected');
  } catch (error) {
    console.log('❌ Redis connection failed:', error.message);
    client = null;
  }
};

const getCache = async (key) => {
  if (!client) return null;
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.log('Cache get error:', error);
    return null;
  }
};

const setCache = async (key, data, ttl = 300) => {
  if (!client) return;
  try {
    await client.setEx(key, ttl, JSON.stringify(data));
  } catch (error) {
    console.log('Cache set error:', error);
  }
};

module.exports = { connectRedis, getCache, setCache };