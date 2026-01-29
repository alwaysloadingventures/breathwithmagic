/**
 * /api/notifications/read
 *
 * PATCH - Mark notifications as read
 *
 * PRD Requirements:
 * - Body: { notificationIds: string[] } (max 50) OR { all: true }
 * - Invalidate Redis unread count cache
 * - Rate limit: 30 requests/minute
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { searchRateLimiter } from "@/lib/rate-limit";
import { invalidateNotificationCache } from "@/lib/cache";
import { markNotificationsReadSchema } from "@/lib/validations/notification";

/**
 * PATCH /api/notifications/read
 *
 * Mark notifications as read (by IDs or all)
 */
export async function PATCH(request: NextRequest) {
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
      `notifications:read:${user.id}`,
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

    // Parse request body
    const body = await request.json();
    const parseResult = markNotificationsReadSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: parseResult.error.issues[0]?.message || "Invalid request body",
          code: "VALIDATION_ERROR",
          details: parseResult.error.issues,
        },
        { status: 400 },
      );
    }

    const { notificationIds, all } = parseResult.data;

    let updatedCount: number;

    if (all) {
      // Mark all notifications as read for this user
      const result = await prisma.notification.updateMany({
        where: {
          userId: user.id,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });
      updatedCount = result.count;
    } else if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read (only if they belong to this user)
      const result = await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: user.id,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });
      updatedCount = result.count;
    } else {
      return NextResponse.json(
        {
          error: "Either notificationIds or all: true must be provided",
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    // Invalidate Redis cache
    await invalidateNotificationCache(user.id);

    return NextResponse.json({
      success: true,
      updatedCount,
    });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json(
      { error: "Failed to update notifications", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
