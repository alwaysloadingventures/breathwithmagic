/**
 * GET /api/user/following
 *
 * List all creators the authenticated user follows.
 * Returns followed creators with profile information for display.
 *
 * Query Parameters:
 * - cursor: Pagination cursor (last follow ID)
 * - limit: Number of results (1-100, default 20)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";
import { followingListQuerySchema } from "@/lib/validations/follow";
import { apiRateLimiter } from "@/lib/rate-limit";
import { ensureUser } from "@/lib/ensure-user";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(
        {
          error: "Please sign in to view your following list",
          code: "UNAUTHORIZED",
        },
        { status: 401 },
      );
    }

    // Rate limit check
    const rateLimitResult = apiRateLimiter.check(clerkId);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          code: "RATE_LIMITED",
          retryAfter: rateLimitResult.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfterSeconds),
          },
        },
      );
    }

    // Get or create the user (auto-sync from Clerk)
    const userResult = await ensureUser();
    if (!userResult) {
      return NextResponse.json(
        { error: "Unable to sync user", code: "USER_SYNC_FAILED" },
        { status: 500 },
      );
    }
    const user = userResult.user;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryResult = followingListQuerySchema.safeParse({
      cursor: searchParams.get("cursor") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        {
          error: queryResult.error.issues[0].message,
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    const { cursor, limit } = queryResult.data;

    // Fetch follows with cursor-based pagination
    // Include creator profile info to avoid N+1 queries
    const follows = await prisma.follow.findMany({
      where: {
        userId: user.id,
        creator: {
          status: "active",
        },
      },
      take: limit + 1, // Fetch one extra to determine if there's more
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1, // Skip the cursor item
          }
        : {}),
      orderBy: { createdAt: "desc" },
      include: {
        creator: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatarUrl: true,
            coverImageUrl: true,
            bio: true,
            category: true,
            subscriptionPrice: true,
            trialEnabled: true,
            isVerified: true,
            _count: {
              select: {
                subscriptions: {
                  where: { status: { in: ["active", "trialing"] } },
                },
                followers: true,
                content: {
                  where: { status: "published" },
                },
              },
            },
          },
        },
      },
    });

    // Check if there are more results
    const hasMore = follows.length > limit;
    const items = hasMore ? follows.slice(0, limit) : follows;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // Format response
    const formattedItems = items.map((follow) => ({
      followId: follow.id,
      followedAt: follow.createdAt.toISOString(),
      creator: {
        id: follow.creator.id,
        handle: follow.creator.handle,
        displayName: follow.creator.displayName,
        avatarUrl: follow.creator.avatarUrl,
        coverImageUrl: follow.creator.coverImageUrl,
        bio: follow.creator.bio,
        category: follow.creator.category,
        subscriptionPrice: follow.creator.subscriptionPrice,
        trialEnabled: follow.creator.trialEnabled,
        isVerified: follow.creator.isVerified,
        stats: {
          subscriberCount: follow.creator._count.subscriptions,
          followerCount: follow.creator._count.followers,
          contentCount: follow.creator._count.content,
        },
      },
    }));

    return NextResponse.json({
      items: formattedItems,
      nextCursor,
      total: await prisma.follow.count({
        where: {
          userId: user.id,
          creator: { status: "active" },
        },
      }),
    });
  } catch (error) {
    console.error("Error fetching following list:", error);
    return NextResponse.json(
      { error: "Failed to fetch following list", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
