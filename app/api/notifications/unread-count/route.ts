/**
 * /api/notifications/unread-count
 *
 * GET - Get just the unread notification count
 *
 * PRD Requirements:
 * - Return from Redis cache if available (30-sec TTL)
 * - Fallback to DB count
 * - Rate limit: 30 requests/minute
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { searchRateLimiter } from "@/lib/rate-limit";
import {
  getCachedNotificationCount,
  setCachedNotificationCount,
} from "@/lib/cache";
import { ensureUser } from "@/lib/ensure-user";

/**
 * GET /api/notifications/unread-count
 *
 * Get the unread notification count for the current user
 */
export async function GET() {
  try {
    // Verify authentication and ensure user exists
    const userResult = await ensureUser();
    if (!userResult) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }
    const user = userResult.user;

    // Check rate limit (30 requests/minute)
    const rateLimitResult = await searchRateLimiter.checkAsync(
      `notifications:count:${user.id}`,
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "30",
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "Retry-After": String(rateLimitResult.retryAfterSeconds || 60),
          },
        },
      );
    }

    // Try Redis cache first (30-second TTL from PRD)
    let unreadCount = await getCachedNotificationCount(user.id);

    if (unreadCount === null) {
      // Cache miss - fetch from database
      unreadCount = await prisma.notification.count({
        where: {
          userId: user.id,
          isRead: false,
        },
      });

      // Cache the count with 30-second TTL
      await setCachedNotificationCount(user.id, unreadCount);
    }

    return NextResponse.json({
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notification count:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification count", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
