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
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { searchRateLimiter } from "@/lib/rate-limit";
import {
  getCachedNotificationCount,
  setCachedNotificationCount,
} from "@/lib/cache";

/**
 * GET /api/notifications/unread-count
 *
 * Get the unread notification count for the current user
 */
export async function GET() {
  try {
    // Verify authentication
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 },
      );
    }

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
