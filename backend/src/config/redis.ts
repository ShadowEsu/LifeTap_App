/**
 * Redis client configuration.
 * Uses ioredis for robust connection management and retry logic.
 */

import Redis from 'ioredis';
import { config } from './env';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config.redis.url, {
      keyPrefix: config.redis.keyPrefix,
      retryStrategy: (times: number) => {
        // Exponential backoff: max 30 seconds
        const delay = Math.min(times * 500, 30000);
        logger.warn({ attempt: times, delay }, 'Redis reconnecting...');
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('error', (err: Error) => {
      logger.error({ err }, 'Redis client error');
    });

    redisClient.on('close', () => {
      logger.warn('Redis client connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis client reconnecting');
    });
  }

  return redisClient;
}

/**
 * Tests the Redis connection.
 * Called on startup to fail fast if Redis is unreachable.
 */
export async function testRedisConnection(): Promise<void> {
  const client = getRedisClient();
  try {
    const pong = await client.ping();
    logger.info({ response: pong }, 'Redis connection verified');
  } catch (err) {
    logger.error({ err }, 'Failed to connect to Redis');
    throw err;
  }
}

/**
 * Gracefully disconnects the Redis client.
 * Called during application shutdown.
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis client disconnected');
  }
}

// ---- Cache helpers -----------------------------------------

const DEFAULT_TTL_SECONDS = 300; // 5 minutes

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  const raw = await client.get(key);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<void> {
  const client = getRedisClient();
  await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

export async function cacheDelete(key: string): Promise<void> {
  const client = getRedisClient();
  await client.del(key);
}

export async function cacheDeletePattern(pattern: string): Promise<void> {
  const client = getRedisClient();
  // Note: keyPrefix is automatically applied by ioredis
  const keys = await client.keys(pattern);
  if (keys.length > 0) {
    await client.del(...keys);
  }
}
