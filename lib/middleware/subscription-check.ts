/**
 * Subscription Access Validation Middleware
 *
 * Provides functions to validate user subscription status before serving content.
 * Uses Redis caching with 5-minute TTL to reduce database load.
 *
 * Features:
 * - Validates user has active subscription to creator
 * - Checks for free content bypass
 * - Redis caching with automatic fallback
 * - Detailed access denial reasons
 *
 * @see PRD Phase 3, Task 12: Paywall Enforcement
 */

import { prisma } from "@/lib/prisma";
import { getCache, setCache, deleteCache, CACHE_TTL } from "@/lib/cache";

// =============================================================================
// TYPES
// =============================================================================

export interface SubscriptionCheckResult {
  /** Whether the user has access to the content */
  hasAccess: boolean;
  /** The reason for the access decision */
  reason: AccessReason;
  /** Subscription details (if subscribed) */
  subscription?: {
    id: string;
    status: string;
    expiresAt: Date | null;
  };
  /** Whether the content is free */
  isFreeContent: boolean;
  /** Creator details for paywall display */
  creator?: {
    id: string;
    handle: string;
    displayName: string;
    subscriptionPrice: string;
    trialEnabled: boolean;
  };
}

export type AccessReason =
  | "free_content"
  | "active_subscription"
  | "trialing"
  | "creator_own_content"
  | "no_subscription"
  | "subscription_expired"
  | "subscription_canceled"
  | "subscription_past_due"
  | "content_not_found"
  | "user_not_found"
  | "unauthenticated";

export interface ContentAccessParams {
  /** The content ID to check access for */
  contentId: string;
  /** The user's internal ID (not Clerk ID) */
  userId?: string;
  /** Skip database lookup if we already have content data */
  content?: {
    id: string;
    isFree: boolean;
    creatorId: string;
    status: string;
  };
}

interface CachedSubscriptionData {
  isActive: boolean;
  status: string;
  subscriptionId: string;
  expiresAt: string | null;
  cachedAt: number;
}

// =============================================================================
// CACHE KEY HELPERS
// =============================================================================

/**
 * Generate cache key for subscription status
 */
function getSubscriptionCacheKey(userId: string, creatorId: string): string {
  return `sub:access:${userId}:${creatorId}`;
}

/**
 * Generate cache key for content metadata
 */
function getContentCacheKey(contentId: string): string {
  return `content:meta:${contentId}`;
}

// =============================================================================
// MAIN ACCESS CHECK FUNCTIONS
// =============================================================================

/**
 * Check if a user has access to view specific content
 *
 * This is the main function to call before serving media URLs.
 * It handles all access scenarios:
 * - Free content (anyone can access)
 * - Paid content (requires subscription)
 * - Creator's own content (always accessible)
 *
 * @param params - Content and user identifiers
 * @returns Access check result with detailed reason
 */
export async function checkContentAccess(
  params: ContentAccessParams,
): Promise<SubscriptionCheckResult> {
  const { contentId, userId, content: providedContent } = params;

  // Unauthenticated users can only access free content
  if (!userId) {
    // Need to check if content is free
    const content = providedContent || (await getContentMetadata(contentId));

    if (!content) {
      return {
        hasAccess: false,
        reason: "content_not_found",
        isFreeContent: false,
      };
    }

    if (content.isFree) {
      return {
        hasAccess: true,
        reason: "free_content",
        isFreeContent: true,
      };
    }

    return {
      hasAccess: false,
      reason: "unauthenticated",
      isFreeContent: false,
    };
  }

  // Get content metadata if not provided
  const content = providedContent || (await getContentMetadata(contentId));

  if (!content) {
    return {
      hasAccess: false,
      reason: "content_not_found",
      isFreeContent: false,
    };
  }

  // Free content is accessible to all authenticated users
  if (content.isFree) {
    return {
      hasAccess: true,
      reason: "free_content",
      isFreeContent: true,
    };
  }

  // Check if user is the creator (creators can always view their own content)
  const isCreator = await checkIfUserIsCreator(userId, content.creatorId);
  if (isCreator) {
    return {
      hasAccess: true,
      reason: "creator_own_content",
      isFreeContent: false,
    };
  }

  // Check subscription status (with caching)
  const subscriptionResult = await checkSubscriptionStatus(
    userId,
    content.creatorId,
  );

  return {
    ...subscriptionResult,
    isFreeContent: false,
  };
}

/**
 * Check subscription status between a user and creator
 * Uses Redis caching with 5-minute TTL
 */
export async function checkSubscriptionStatus(
  userId: string,
  creatorId: string,
): Promise<Omit<SubscriptionCheckResult, "isFreeContent">> {
  const cacheKey = getSubscriptionCacheKey(userId, creatorId);

  // Try cache first
  const cached = await getCache<CachedSubscriptionData>(cacheKey);

  if (cached) {
    // Cache hit - need to revalidate canceled subscriptions against current time
    let hasAccess = cached.isActive;

    // If it was cached as active, double-check canceled subscriptions haven't expired
    if (cached.isActive && cached.status === "canceled" && cached.expiresAt) {
      const expiresAt = new Date(cached.expiresAt);
      const now = new Date();
      hasAccess = expiresAt > now;
    }

    if (hasAccess) {
      return {
        hasAccess: true,
        reason:
          cached.status === "trialing" ? "trialing" : "active_subscription",
        subscription: {
          id: cached.subscriptionId,
          status: cached.status,
          expiresAt: cached.expiresAt ? new Date(cached.expiresAt) : null,
        },
      };
    }

    // Cached as not subscribed or expired - get creator info for paywall
    const creator = await getCreatorInfo(creatorId);
    return {
      hasAccess: false,
      reason: statusToReason(cached.status),
      creator,
    };
  }

  // Cache miss - query database
  const subscription = await prisma.subscription.findUnique({
    where: {
      userId_creatorId: {
        userId,
        creatorId,
      },
    },
    select: {
      id: true,
      status: true,
      currentPeriodEnd: true,
    },
  });

  // Determine if subscription is active
  // Include canceled subscriptions that are still within their paid period
  const now = new Date();
  const isActive =
    subscription?.status === "active" ||
    subscription?.status === "trialing" ||
    (subscription?.status === "canceled" &&
      subscription?.currentPeriodEnd &&
      subscription.currentPeriodEnd > now);

  // Cache the result
  const cacheData: CachedSubscriptionData = {
    isActive: isActive ?? false,
    status: subscription?.status || "no_subscription",
    subscriptionId: subscription?.id || "",
    expiresAt: subscription?.currentPeriodEnd?.toISOString() || null,
    cachedAt: Date.now(),
  };

  await setCache(cacheKey, cacheData, CACHE_TTL.SUBSCRIPTION_STATUS);

  if (isActive && subscription) {
    return {
      hasAccess: true,
      reason:
        subscription.status === "trialing" ? "trialing" : "active_subscription",
      subscription: {
        id: subscription.id,
        status: subscription.status,
        expiresAt: subscription.currentPeriodEnd,
      },
    };
  }

  // Not subscribed - get creator info for paywall display
  const creator = await getCreatorInfo(creatorId);

  return {
    hasAccess: false,
    reason: statusToReason(subscription?.status || null),
    creator,
  };
}

/**
 * Revalidate subscription status during playback
 * Used for periodic checks during long video playback
 *
 * @returns Object with validity status and time until next check needed
 */
export async function revalidateAccess(
  userId: string,
  contentId: string,
): Promise<{
  valid: boolean;
  reason: AccessReason;
  expiresIn: number;
  nextCheckIn: number;
}> {
  // Get content to find creator
  const content = await getContentMetadata(contentId);

  if (!content) {
    return {
      valid: false,
      reason: "content_not_found",
      expiresIn: 0,
      nextCheckIn: 0,
    };
  }

  // Free content doesn't need revalidation
  if (content.isFree) {
    return {
      valid: true,
      reason: "free_content",
      expiresIn: 3600, // 1 hour
      nextCheckIn: 600, // Check again in 10 minutes (though not strictly needed)
    };
  }

  // Check subscription - force fresh check by bypassing cache
  const subscription = await prisma.subscription.findUnique({
    where: {
      userId_creatorId: {
        userId,
        creatorId: content.creatorId,
      },
    },
    select: {
      status: true,
      currentPeriodEnd: true,
    },
  });

  // Check if subscription is active (including canceled but still within paid period)
  const now = new Date();
  const isActive =
    subscription?.status === "active" ||
    subscription?.status === "trialing" ||
    (subscription?.status === "canceled" &&
      subscription?.currentPeriodEnd &&
      subscription.currentPeriodEnd > now);

  if (!isActive) {
    return {
      valid: false,
      reason: statusToReason(subscription?.status || null),
      expiresIn: 0,
      nextCheckIn: 0,
    };
  }

  // Calculate time until subscription expires
  // Note: reusing 'now' from above check
  const expiresAt =
    subscription?.currentPeriodEnd ||
    new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiresIn = Math.max(
    0,
    Math.floor((expiresAt.getTime() - now.getTime()) / 1000),
  );

  // Recommend checking again in 5 minutes, or sooner if subscription expires soon
  const nextCheckIn = Math.min(300, expiresIn);

  return {
    valid: true,
    reason:
      subscription?.status === "trialing" ? "trialing" : "active_subscription",
    expiresIn,
    nextCheckIn,
  };
}

// =============================================================================
// CACHE INVALIDATION
// =============================================================================

/**
 * Invalidate subscription cache for a user-creator pair
 * Call this when subscription status changes
 */
export async function invalidateSubscriptionAccessCache(
  userId: string,
  creatorId: string,
): Promise<void> {
  const cacheKey = getSubscriptionCacheKey(userId, creatorId);
  await deleteCache(cacheKey);
}

/**
 * Invalidate content metadata cache
 * Call this when content is updated
 */
export async function invalidateContentCache(contentId: string): Promise<void> {
  const cacheKey = getContentCacheKey(contentId);
  await deleteCache(cacheKey);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

interface ContentMetadata {
  id: string;
  isFree: boolean;
  creatorId: string;
  status: string;
}

/**
 * Get content metadata with caching
 */
async function getContentMetadata(
  contentId: string,
): Promise<ContentMetadata | null> {
  const cacheKey = getContentCacheKey(contentId);

  // Try cache first
  const cached = await getCache<ContentMetadata>(cacheKey);
  if (cached) {
    return cached;
  }

  // Query database
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: {
      id: true,
      isFree: true,
      creatorId: true,
      status: true,
    },
  });

  if (!content) {
    return null;
  }

  // Cache for 5 minutes
  await setCache(cacheKey, content, CACHE_TTL.SUBSCRIPTION_STATUS);

  return content;
}

/**
 * Check if a user is the creator of the content
 */
async function checkIfUserIsCreator(
  userId: string,
  creatorId: string,
): Promise<boolean> {
  const creator = await prisma.creatorProfile.findUnique({
    where: { id: creatorId },
    select: { userId: true },
  });

  return creator?.userId === userId;
}

/**
 * Get creator info for paywall display
 */
async function getCreatorInfo(
  creatorId: string,
): Promise<SubscriptionCheckResult["creator"]> {
  const creator = await prisma.creatorProfile.findUnique({
    where: { id: creatorId },
    select: {
      id: true,
      handle: true,
      displayName: true,
      subscriptionPrice: true,
      trialEnabled: true,
    },
  });

  if (!creator) {
    return undefined;
  }

  return {
    id: creator.id,
    handle: creator.handle,
    displayName: creator.displayName,
    subscriptionPrice: creator.subscriptionPrice,
    trialEnabled: creator.trialEnabled,
  };
}

/**
 * Convert subscription status to access reason
 */
function statusToReason(status: string | null): AccessReason {
  switch (status) {
    case "active":
      return "active_subscription";
    case "trialing":
      return "trialing";
    case "canceled":
      return "subscription_canceled";
    case "past_due":
      return "subscription_past_due";
    default:
      return "no_subscription";
  }
}

/**
 * Check if a subscription has expired based on its period end date
 * Used for determining if a canceled subscription still has access
 */
export function isSubscriptionExpired(
  status: string | null,
  currentPeriodEnd: Date | null,
): boolean {
  if (!status) return true;

  // Active and trialing subscriptions are not expired
  if (status === "active" || status === "trialing") {
    return false;
  }

  // Past due subscriptions are not technically expired, but payment failed
  if (status === "past_due") {
    return false;
  }

  // Canceled subscriptions are expired only if past their period end
  if (status === "canceled") {
    if (!currentPeriodEnd) return true;
    return new Date() > currentPeriodEnd;
  }

  // Unknown status is treated as expired (fail-closed)
  return true;
}

/**
 * Get user-friendly message for access denial reason
 */
export function getAccessDenialMessage(reason: AccessReason): string {
  switch (reason) {
    case "no_subscription":
      return "Subscribe to access this content";
    case "subscription_expired":
      return "Your subscription has expired. Renew to regain access.";
    case "subscription_canceled":
      return "Your subscription has ended. Subscribe again to access this content.";
    case "subscription_past_due":
      return "There was an issue with your payment. Please update your payment method.";
    case "content_not_found":
      return "This content is no longer available.";
    case "unauthenticated":
      return "Please sign in to access this content.";
    default:
      return "You don't have access to this content.";
  }
}

// =============================================================================
// BATCH ACCESS CHECK
// =============================================================================

/**
 * Check access for multiple content items at once
 * Useful for feed pages to avoid N+1 queries
 */
export async function checkBatchContentAccess(
  userId: string | undefined,
  contentIds: string[],
): Promise<Map<string, boolean>> {
  const accessMap = new Map<string, boolean>();

  if (contentIds.length === 0) {
    return accessMap;
  }

  // Get all content metadata
  const contents = await prisma.content.findMany({
    where: { id: { in: contentIds } },
    select: {
      id: true,
      isFree: true,
      creatorId: true,
    },
  });

  // Group by creator for efficient subscription checks
  const creatorContentMap = new Map<string, string[]>();
  const freeContentIds = new Set<string>();

  for (const content of contents) {
    if (content.isFree) {
      freeContentIds.add(content.id);
      accessMap.set(content.id, true);
    } else {
      const existing = creatorContentMap.get(content.creatorId) || [];
      existing.push(content.id);
      creatorContentMap.set(content.creatorId, existing);
    }
  }

  // If no user or no paid content, return early
  if (!userId || creatorContentMap.size === 0) {
    // Mark all paid content as inaccessible
    for (const contentList of creatorContentMap.values()) {
      for (const contentId of contentList) {
        accessMap.set(contentId, false);
      }
    }
    return accessMap;
  }

  // Check subscriptions for each creator
  // Include canceled subscriptions that are still within their paid period
  const creatorIds = Array.from(creatorContentMap.keys());
  const now = new Date();
  const subscriptions = await prisma.subscription.findMany({
    where: {
      userId,
      creatorId: { in: creatorIds },
      OR: [
        { status: { in: ["active", "trialing"] } },
        {
          status: "canceled",
          currentPeriodEnd: { gt: now },
        },
      ],
    },
    select: {
      creatorId: true,
    },
  });

  const subscribedCreators = new Set(subscriptions.map((s) => s.creatorId));

  // Set access based on subscription status
  for (const [creatorId, contentIds] of creatorContentMap) {
    const hasAccess = subscribedCreators.has(creatorId);
    for (const contentId of contentIds) {
      accessMap.set(contentId, hasAccess);
    }
  }

  return accessMap;
}
