/**
 * /api/creator/subscribers
 *
 * GET - List creator's subscribers with pagination and search
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { subscriberListQuerySchema } from "@/lib/validations/analytics";
import { createRateLimiter } from "@/lib/rate-limit";

/**
 * Rate limiter for subscribers API
 * PRD: 100 requests per minute for general API endpoints
 */
const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
});

/**
 * GET /api/creator/subscribers
 *
 * List subscribers for the authenticated creator
 * Query params:
 *   - cursor: Pagination cursor
 *   - limit: Number of items (default: 20, max: 100)
 *   - search: Search by name or email
 *   - status: Filter by status (active, trialing, all)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // Check rate limit
    const rateLimitResult = apiRateLimiter.check(clerkId);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" },
        {
          status: 429,
          headers: {
            "Retry-After":
              rateLimitResult.retryAfterSeconds?.toString() || "60",
          },
        },
      );
    }

    // Get user and creator profile
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        creatorProfile: {
          select: { id: true },
        },
      },
    });

    if (!user?.creatorProfile) {
      return NextResponse.json(
        { error: "Creator profile not found", code: "NOT_CREATOR" },
        { status: 403 },
      );
    }

    const creatorId = user.creatorProfile.id;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryResult = subscriberListQuerySchema.safeParse({
      cursor: searchParams.get("cursor") || undefined,
      limit: searchParams.get("limit") || 20,
      search: searchParams.get("search") || undefined,
      status: searchParams.get("status") || "all",
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

    const { cursor, limit, search, status } = queryResult.data;

    // Build where clause
    const where: Prisma.SubscriptionWhereInput = {
      creatorId,
    };

    // Filter by status
    if (status === "active") {
      where.status = "active";
    } else if (status === "trialing") {
      where.status = "trialing";
    } else {
      // "all" - show active and trialing
      where.status = { in: ["active", "trialing"] };
    }

    // Search by user name or email
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    // Get total count for display
    const total = await prisma.subscription.count({ where });

    // Fetch subscriptions with cursor-based pagination
    const subscriptions = await prisma.subscription.findMany({
      where,
      take: limit + 1, // Fetch one extra to determine if there's a next page
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0, // Skip the cursor item
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Determine if there's a next page
    const hasNextPage = subscriptions.length > limit;
    const items = hasNextPage ? subscriptions.slice(0, limit) : subscriptions;
    const nextCursor = hasNextPage ? items[items.length - 1]?.id : null;

    return NextResponse.json({
      items: items.map((sub) => ({
        id: sub.id,
        userId: sub.userId,
        user: {
          id: sub.user.id,
          name: sub.user.name,
          email: sub.user.email,
          avatarUrl: sub.user.avatarUrl,
        },
        status: sub.status,
        priceAtPurchase: sub.priceAtPurchase,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        createdAt: sub.createdAt,
      })),
      nextCursor,
      total,
    });
  } catch (error) {
    console.error("Error listing subscribers:", error);
    return NextResponse.json(
      { error: "Failed to list subscribers", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
