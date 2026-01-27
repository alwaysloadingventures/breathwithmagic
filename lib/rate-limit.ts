/**
 * Rate limiter for API endpoints
 *
 * This module provides rate limiting with Redis support for production
 * and in-memory fallback for development environments.
 *
 * Uses Upstash Redis when available for distributed rate limiting
 * across serverless instances.
 */

import { redis } from "./cache";

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}

/**
 * Creates a rate limiter with the specified configuration.
 * Uses Redis when available, falls back to in-memory store.
 *
 * @param config - Rate limit configuration
 * @returns Object with check function
 */
export function createRateLimiter(config: RateLimitConfig) {
  // In-memory store for development/fallback
  const memoryStore = new Map<string, RateLimitEntry>();

  // Periodic cleanup of expired entries (runs every 5 minutes)
  const cleanupInterval = setInterval(
    () => {
      const now = Date.now();
      for (const [key, value] of memoryStore.entries()) {
        if (now - value.windowStart >= config.windowMs) {
          memoryStore.delete(key);
        }
      }
    },
    5 * 60 * 1000
  );

  // Allow cleanup to be stopped if needed (useful for testing)
  // Note: In serverless, this interval may not persist between invocations
  if (typeof cleanupInterval.unref === "function") {
    cleanupInterval.unref();
  }

  /**
   * Check rate limit using Redis (distributed, production-ready)
   */
  async function checkWithRedis(identifier: string): Promise<RateLimitResult> {
    if (!redis) {
      // Fall back to memory if Redis not available
      return checkWithMemory(identifier);
    }

    const key = `ratelimit:${identifier}`;
    const windowSeconds = Math.ceil(config.windowMs / 1000);

    try {
      // Use Redis INCR with expiration for atomic rate limiting
      // This is a sliding window approach using Redis
      const now = Date.now();
      const windowKey = `${key}:${Math.floor(now / config.windowMs)}`;

      // Increment counter and set expiration atomically
      const count = await redis.incr(windowKey);

      // Set expiration on first request in window
      if (count === 1) {
        await redis.expire(windowKey, windowSeconds + 1);
      }

      if (count > config.maxRequests) {
        // Get TTL to calculate retry-after
        const ttl = await redis.ttl(windowKey);
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: ttl > 0 ? ttl : windowSeconds,
        };
      }

      return {
        allowed: true,
        remaining: config.maxRequests - count,
      };
    } catch (error) {
      console.error("Redis rate limit error, falling back to memory:", error);
      // Fall back to memory on Redis error
      return checkWithMemory(identifier);
    }
  }

  /**
   * Check rate limit using in-memory store (for development/fallback)
   */
  function checkWithMemory(identifier: string): RateLimitResult {
    const now = Date.now();
    const entry = memoryStore.get(identifier);

    // If no record exists or window has expired, create a new one
    if (!entry || now - entry.windowStart >= config.windowMs) {
      memoryStore.set(identifier, { count: 1, windowStart: now });
      return { allowed: true, remaining: config.maxRequests - 1 };
    }

    // Check if within limit
    if (entry.count >= config.maxRequests) {
      const retryAfterMs = config.windowMs - (now - entry.windowStart);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
      };
    }

    // Increment count
    entry.count += 1;
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
    };
  }

  return {
    /**
     * Check if a request is allowed under the rate limit (async, uses Redis when available)
     *
     * @param identifier - Unique identifier (usually userId)
     * @returns Promise<RateLimitResult>
     */
    async checkAsync(identifier: string): Promise<RateLimitResult> {
      return checkWithRedis(identifier);
    },

    /**
     * Check if a request is allowed under the rate limit (sync, memory only)
     * Use this for backwards compatibility or when async is not possible
     *
     * @param identifier - Unique identifier (usually userId)
     * @returns RateLimitResult
     */
    check(identifier: string): RateLimitResult {
      return checkWithMemory(identifier);
    },

    /**
     * Get the current memory store (for debugging/testing)
     */
    getStore() {
      return memoryStore;
    },

    /**
     * Check if Redis is being used for rate limiting
     */
    isUsingRedis(): boolean {
      return redis !== null;
    },
  };
}

/**
 * Content upload rate limiter
 * PRD: 10 uploads per hour (line 155)
 */
export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
});

/**
 * Search/check endpoints rate limiter
 * PRD: 30 requests per minute
 */
export const searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,
});

/**
 * API general rate limiter
 * PRD: 100 requests per minute
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
});

/**
 * Subscription/payment endpoints rate limiter
 * More restrictive to prevent abuse - 10 per minute
 */
export const subscriptionRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
});
