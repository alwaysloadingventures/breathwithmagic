/**
 * /api/notifications
 *
 * GET - Fetch user's notifications (paginated)
 *
 * PRD Requirements:
 * - Cursor-based pagination (limit default 20, max 100)
 * - Returns: { items: Notification[], nextCursor: string | null, unreadCount: number }
 * - Rate limit: 30 requests/minute
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { searchRateLimiter } from "@/lib/rate-limit";
import {
  getCachedNotificationCount,
  setCachedNotificationCount,
} from "@/lib/cache";
import { notificationListQuerySchema } from "@/lib/validations/notification";
import { ensureUser } from "@/lib/ensure-user";

/**
 * GET /api/notifications
 *
 * Fetch notifications for the current user with pagination
 */
export async function GET(request: NextRequest) {
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
      `notifications:${user.id}`,
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryResult = notificationListQuerySchema.safeParse({
      cursor: searchParams.get("cursor") || undefined,
      limit: searchParams.get("limit") || 20,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          code: "VALIDATION_ERROR",
          details: queryResult.error.issues,
        },
        { status: 400 },
      );
    }

    const { cursor, limit } = queryResult.data;

    // Fetch notifications
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: "desc" },
    });

    // Get unread count - check Redis cache first
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

    // Determine pagination
    const hasNextPage = notifications.length > limit;
    const items = hasNextPage ? notifications.slice(0, limit) : notifications;
    const nextCursor = hasNextPage ? items[items.length - 1]?.id : null;

    return NextResponse.json({
      items: items.map((notification) => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        link: notification.link,
        isRead: notification.isRead,
        createdAt: notification.createdAt.toISOString(),
      })),
      nextCursor,
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
