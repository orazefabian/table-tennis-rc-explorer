const CACHE_TTL = parseInt(process.env.CACHE_TTL || '300000', 10);
const REDIS_URL = process.env.REDIS_URL || null;

let cache;
let redisClient = null;

async function initRedis() {
  if (!REDIS_URL) return null;
  try {
    const { Redis } = await import('@upstash/redis');
    redisClient = new Redis({ url: REDIS_URL, token: process.env.REDIS_TOKEN });
    return redisClient;
  } catch (e) {
    console.warn('Redis init failed:', e.message);
    return null;
  }
}

function getInMemoryCache() {
  if (!cache) {
    cache = new Map();
  }
  return cache;
}

async function getCached(key) {
  if (redisClient) {
    try {
      const data = await redisClient.get(key);
      if (data) return data;
    } catch (e) {
      console.warn('Redis get failed:', e.message);
    }
    return null;
  }

  const mem = getInMemoryCache();
  const entry = mem.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  mem.delete(key);
  return null;
}

async function setCache(key, data) {
  if (redisClient) {
    try {
      await redisClient.set(key, data, { ex: Math.floor(CACHE_TTL / 1000) });
    } catch (e) {
      console.warn('Redis set failed:', e.message);
    }
    return;
  }

  const mem = getInMemoryCache();
  mem.set(key, { data, ts: Date.now() });
}

async function clearCache() {
  if (redisClient) {
    try {
      await redisClient.flushdb();
    } catch (e) {
      console.warn('Redis clear failed:', e.message);
    }
    return;
  }

  const mem = getInMemoryCache();
  mem.clear();
}

const isRedisConfigured = !!REDIS_URL;

export { getCached, setCache, clearCache, CACHE_TTL, isRedisConfigured, initRedis };
