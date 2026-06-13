import { Redis } from 'ioredis';
import { logger } from '../utils/logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * General-purpose Redis client (matchmaking queues, leaderboard, rate limits).
 */
export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: false,
});

/**
 * Pub/Sub clients for the Socket.io Redis adapter.
 * The adapter requires two dedicated connections.
 */
export const pubClient = new Redis(redisUrl, { maxRetriesPerRequest: null });
export const subClient = pubClient.duplicate();

redis.on('connect', () => logger.info('Redis (main) connected'));
redis.on('error', (err) => logger.error({ err }, 'Redis (main) error'));

pubClient.on('error', (err) => logger.error({ err }, 'Redis pub error'));
subClient.on('error', (err) => logger.error({ err }, 'Redis sub error'));

export async function pingRedis(): Promise<boolean> {
  try {
    const r = await redis.ping();
    return r === 'PONG';
  } catch {
    return false;
  }
}
