/**
 * Redis caching layer using Upstash
 *
 * Provides caching for frequently accessed data to reduce database load.
 * Falls back gracefully when Redis is not configured (development environments).
 *
 * Cache TTLs from PRD:
 * - Subscription status: 5 minutes
 * - Creator profiles: 10 minutes
 * - Notification counts: 30 seconds
 */

import { Redis } from "@upstash/redis";

// Initialize Redis client (will be null if env vars not set)
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

/**
 * Cache TTL values in seconds (from PRD specifications)
 */
export const CACHE_TTL = {
  /** Subscription status cache: 5 minutes */
  SUBSCRIPTION_STATUS: 5 * 60,
  /** Creator profile cache: 10 minutes */
  CREATOR_PROFILE: 10 * 60,
  /** Notification count cache: 30 seconds */
  NOTIFICATION_COUNT: 30,
} as const;

/**
 * Get a value from the cache
 *
 * @param key - Cache key
 * @returns Cached value or null if not found/error
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    return await redis.get<T>(key);
  } catch (error) {
    console.error("Redis get error:", error);
    return null;
  }
}

/**
 * Set a value in the cache with TTL
 *
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttlSeconds - Time-to-live in seconds
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    console.error("Redis set error:", error);
  }
}

/**
 * Delete a value from the cache
 *
 * @param key - Cache key to delete
 */
export async function deleteCache(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (error) {
    console.error("Redis delete error:", error);
  }
}

/**
 * Delete multiple cache keys matching a pattern
 *
 * @param pattern - Key pattern (e.g., "sub:user123:*")
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    // Upstash supports SCAN for pattern matching
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error("Redis delete pattern error:", error);
  }
}

// ============================================================================
// Subscription Status Caching
// ============================================================================

interface SubscriptionStatusCache {
  isSubscribed: boolean;
  status: string | null;
}

/**
 * Get cached subscription status for a user-creator pair
 *
 * @param userId - User ID
 * @param creatorId - Creator profile ID
 * @returns Cached status or null if not cached
 */
export async function getCachedSubscriptionStatus(
  userId: string,
  creatorId: string
): Promise<SubscriptionStatusCache | null> {
  const key = `sub:${userId}:${creatorId}`;
  return getCache<SubscriptionStatusCache>(key);
}

/**
 * Cache subscription status for a user-creator pair
 *
 * @param userId - User ID
 * @param creatorId - Creator profile ID
 * @param data - Subscription status data
 */
export async function setCachedSubscriptionStatus(
  userId: string,
  creatorId: string,
  data: SubscriptionStatusCache
): Promise<void> {
  const key = `sub:${userId}:${creatorId}`;
  await setCache(key, data, CACHE_TTL.SUBSCRIPTION_STATUS);
}

/**
 * Invalidate subscription cache for a user-creator pair
 * Call this when subscription status changes (subscribe, unsubscribe, etc.)
 *
 * @param userId - User ID
 * @param creatorId - Creator profile ID
 */
export async function invalidateSubscriptionCache(
  userId: string,
  creatorId: string
): Promise<void> {
  const key = `sub:${userId}:${creatorId}`;
  await deleteCache(key);
}

/**
 * Invalidate all subscription caches for a creator
 * Call this when creator pricing changes or account is deactivated
 *
 * @param creatorId - Creator profile ID
 */
export async function invalidateCreatorSubscriptionCaches(
  creatorId: string
): Promise<void> {
  await deleteCachePattern(`sub:*:${creatorId}`);
}

// ============================================================================
// Creator Profile Caching
// ============================================================================

/**
 * Get cached creator profile
 *
 * @param creatorId - Creator profile ID or handle
 * @returns Cached profile or null if not cached
 */
export async function getCachedCreatorProfile<T>(
  creatorId: string
): Promise<T | null> {
  const key = `profile:${creatorId}`;
  return getCache<T>(key);
}

/**
 * Cache creator profile data
 *
 * @param creatorId - Creator profile ID or handle
 * @param profile - Profile data to cache
 */
export async function setCachedCreatorProfile<T>(
  creatorId: string,
  profile: T
): Promise<void> {
  const key = `profile:${creatorId}`;
  await setCache(key, profile, CACHE_TTL.CREATOR_PROFILE);
}

/**
 * Invalidate creator profile cache
 * Call this when profile is updated
 *
 * @param creatorId - Creator profile ID
 * @param handle - Creator handle (optional, for handle-based lookups)
 */
export async function invalidateCreatorProfileCache(
  creatorId: string,
  handle?: string
): Promise<void> {
  await deleteCache(`profile:${creatorId}`);
  if (handle) {
    await deleteCache(`profile:${handle}`);
  }
}

// ============================================================================
// Notification Count Caching
// ============================================================================

/**
 * Get cached notification count for a user
 *
 * @param userId - User ID
 * @returns Cached count or null if not cached
 */
export async function getCachedNotificationCount(
  userId: string
): Promise<number | null> {
  const key = `notifications:${userId}`;
  return getCache<number>(key);
}

/**
 * Cache notification count for a user
 *
 * @param userId - User ID
 * @param count - Notification count
 */
export async function setCachedNotificationCount(
  userId: string,
  count: number
): Promise<void> {
  const key = `notifications:${userId}`;
  await setCache(key, count, CACHE_TTL.NOTIFICATION_COUNT);
}

/**
 * Invalidate notification count cache
 * Call this when notifications are added, read, or deleted
 *
 * @param userId - User ID
 */
export async function invalidateNotificationCache(
  userId: string
): Promise<void> {
  const key = `notifications:${userId}`;
  await deleteCache(key);
}

// ============================================================================
// Export Redis Instance
// ============================================================================

/**
 * Export redis instance for advanced use cases (e.g., rate limiting)
 * Note: Will be null if Redis is not configured
 */
export { redis };

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return redis !== null;
}
