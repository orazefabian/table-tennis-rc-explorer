interface CacheEntry {
  data: string;
  ts: number;
}

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { ex: number }): Promise<void>;
  flushdb(): Promise<void>;
}

const CACHE_TTL = parseInt(process.env.CACHE_TTL || '300000', 10);
const REDIS_URL = process.env.REDIS_URL || null;
const REDIS_TOKEN = process.env.REDIS_TOKEN;

let cache: Map<string, CacheEntry> | null = null;
let redisClient: RedisClient | null = null;

async function initRedis(): Promise<RedisClient | null> {
  if (!REDIS_URL) return null;
  try {
    const { Redis } = await import('@upstash/redis');
    redisClient = new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) as unknown as RedisClient;
    return redisClient;
  } catch (e) {
    console.warn('Redis init failed:', (e as Error).message);
    return null;
  }
}

function getInMemoryCache(): Map<string, CacheEntry> {
  if (!cache) {
    cache = new Map();
  }
  return cache;
}

async function getCached(key: string): Promise<string | null> {
  if (redisClient) {
    try {
      const data = await redisClient.get(key);
      if (data) return data;
    } catch (e) {
      console.warn('Redis get failed:', (e as Error).message);
    }
    return null;
  }

  const mem = getInMemoryCache();
  const entry = mem.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  mem.delete(key);
  return null;
}

async function setCache(key: string, data: string): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.set(key, data, { ex: Math.floor(CACHE_TTL / 1000) });
    } catch (e) {
      console.warn('Redis set failed:', (e as Error).message);
    }
    return;
  }

  const mem = getInMemoryCache();
  mem.set(key, { data, ts: Date.now() });
}

async function clearCache(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.flushdb();
    } catch (e) {
      console.warn('Redis clear failed:', (e as Error).message);
    }
    return;
  }

  const mem = getInMemoryCache();
  mem.clear();
}

const isRedisConfigured = !!REDIS_URL;

export { getCached, setCache, clearCache, CACHE_TTL, isRedisConfigured, initRedis };
export type { CacheEntry, RedisClient };
