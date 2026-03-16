const redis = require('redis');

class CacheManager {
    constructor(maxSize = 1000, defaultTTL = 300) {
        this.memoryCache = new Map();
        this.timers = new Map();
        this.maxSize = maxSize;
        this.defaultTTL = defaultTTL; // seconds
        this.redisClient = null;
        this.isRedisConnected = false;
    }

    async connect() {
        const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;

        if (redisUrl) {
            try {
                this.redisClient = redis.createClient({
                    url: redisUrl,
                    socket: { reconnectStrategy: false }
                });

                this.redisClient.on('error', (err) => {
                    console.error('❌ Redis Client Error:', err.message);
                    this.isRedisConnected = false;
                });

                this.redisClient.on('connect', () => {
                    console.log('✅ Connected to Upstash Redis Cache');
                    this.isRedisConnected = true;
                });

                await this.redisClient.connect();
            } catch (error) {
                console.error('❌ Failed to connect to Redis, falling back to Memory Cache:', error.message);
                this.isRedisConnected = false;
                this.redisClient = null;
            }
        } else {
            console.log('✅ No REDIS_URL provided. Using in-memory fallback cache.');
        }
    }

    async get(key) {
        if (this.isRedisConnected && this.redisClient) {
            try {
                const data = await this.redisClient.get(key);
                return data ? JSON.parse(data) : null;
            } catch (error) {
                // Fallback to memory on Redis failure
            }
        }

        // Memory fallback
        const item = this.memoryCache.get(key);
        if (!item) return null;
        if (Date.now() > item.expires) {
            this.deleteFallback(key);
            return null;
        }
        return item.data;
    }

    async set(key, data, ttl = this.defaultTTL) {
        if (this.isRedisConnected && this.redisClient) {
            try {
                await this.redisClient.setEx(key, ttl, JSON.stringify(data));
                return;
            } catch (error) {
                // Fallback to memory
            }
        }

        // Memory fallback
        this.setFallback(key, data, ttl);
    }

    setFallback(key, data, ttl) {
        if (this.timers.has(key)) clearTimeout(this.timers.get(key));
        if (this.memoryCache.size >= this.maxSize && !this.memoryCache.has(key)) {
            const firstKey = this.memoryCache.keys().next().value;
            this.deleteFallback(firstKey);
        }
        const expires = Date.now() + (ttl * 1000);
        this.memoryCache.set(key, { data, expires });
        const timer = setTimeout(() => this.deleteFallback(key), ttl * 1000);
        this.timers.set(key, timer);
    }

    deleteFallback(key) {
        this.memoryCache.delete(key);
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
            this.timers.delete(key);
        }
    }

    async clear() {
        if (this.isRedisConnected && this.redisClient) {
            try {
                await this.redisClient.flushDb();
            } catch (e) { }
        }
        for (const timer of this.timers.values()) clearTimeout(timer);
        this.memoryCache.clear();
        this.timers.clear();
    }

    // Express Middleware for route caching
    middleware(durationSeconds = 300) {
        return async (req, res, next) => {
            if (req.method !== 'GET') return next();

            const key = `route:${req.originalUrl}`;
            const cachedResponse = await this.get(key);

            if (cachedResponse) {
                res.setHeader('X-Cache', 'HIT');
                return res.json(cachedResponse);
            }

            const originalJson = res.json;
            res.json = (data) => {
                if (res.statusCode === 200) {
                    // Fire and forget caching
                    this.set(key, data, durationSeconds).catch(() => { });
                    res.setHeader('X-Cache', 'MISS');
                }
                originalJson.call(res, data);
            };

            next();
        };
    }
}

const cacheManager = new CacheManager();

module.exports = {
    connectRedis: () => cacheManager.connect(),
    getCache: (key) => cacheManager.get(key),
    setCache: (key, data, ttl) => cacheManager.set(key, data, ttl),
    clearCache: () => cacheManager.clear(),
    cacheMiddleware: (durationSeconds) => cacheManager.middleware(durationSeconds)
};
