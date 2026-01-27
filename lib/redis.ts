/**
 * Redis Client for Upstash
 *
 * Used for caching and rate limiting.
 * Falls back gracefully if Redis is not configured.
 */
import { Redis } from "@upstash/redis";

// Create Redis client if environment variables are set
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis =
  redisUrl && redisToken
    ? new Redis({
        url: redisUrl,
        token: redisToken,
      })
    : null;

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return redis !== null;
}

/**
 * Rate limiter using Redis
 *
 * @param key - Unique identifier for the rate limit (e.g., "search:user-id")
 * @param limit - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns Object with allowed boolean and remaining count
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  if (!redis) {
    // If Redis is not configured, allow all requests (dev mode)
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs };
  }

  const now = Date.now();
  const windowStart = now - windowMs;
  const redisKey = `ratelimit:${key}`;

  try {
    // Use a sorted set to track requests
    // Remove old entries outside the window
    await redis.zremrangebyscore(redisKey, 0, windowStart);

    // Count current requests in window
    const count = await redis.zcard(redisKey);

    if (count >= limit) {
      // Get the oldest entry to calculate reset time
      const oldest = await redis.zrange<string[]>(redisKey, 0, 0, {
        withScores: true,
      });
      const resetAt =
        oldest.length > 1 ? parseInt(oldest[1]) + windowMs : now + windowMs;

      return { allowed: false, remaining: 0, resetAt };
    }

    // Add current request
    await redis.zadd(redisKey, {
      score: now,
      member: `${now}-${Math.random()}`,
    });

    // Set expiry on the key
    await redis.expire(redisKey, Math.ceil(windowMs / 1000) + 1);

    return {
      allowed: true,
      remaining: limit - count - 1,
      resetAt: now + windowMs,
    };
  } catch (error) {
    console.error("Rate limit error:", error);
    // On error, allow the request (fail open)
    return { allowed: true, remaining: limit, resetAt: now + windowMs };
  }
}

/**
 * Cache helper with automatic JSON serialization
 */
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    if (!redis) return null;
    try {
      return await redis.get<T>(key);
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!redis) return;
    try {
      if (ttlSeconds) {
        await redis.set(key, value, { ex: ttlSeconds });
      } else {
        await redis.set(key, value);
      }
    } catch (error) {
      console.error("Cache set error:", error);
    }
  },

  async delete(key: string): Promise<void> {
    if (!redis) return;
    try {
      await redis.del(key);
    } catch (error) {
      console.error("Cache delete error:", error);
    }
  },
};
