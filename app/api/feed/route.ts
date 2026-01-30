/**
 * GET /api/feed
 *
 * Unified home feed for authenticated users.
 * Returns content from:
 * - Subscribed creators: ALL content (free + paid)
 * - Followed creators (not subscribed): Only FREE content
 *
 * Sorted by publishedAt DESC with cursor-based pagination.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { feedQuerySchema } from "@/lib/validations/feed";
import { apiRateLimiter } from "@/lib/rate-limit";
import { ensureUser } from "@/lib/ensure-user";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(
        {
          error: "Please sign in to view your feed",
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
    const queryResult = feedQuerySchema.safeParse({
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

    // Get subscribed creator IDs (active subscriptions)
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId: user.id,
        status: { in: ["active", "trialing"] },
      },
      select: { creatorId: true },
    });
    const subscribedCreatorIds = subscriptions.map((s) => s.creatorId);

    // Get followed creator IDs (excluding those we're subscribed to)
    const follows = await prisma.follow.findMany({
      where: {
        userId: user.id,
        creatorId: { notIn: subscribedCreatorIds },
      },
      select: { creatorId: true },
    });
    const followedOnlyCreatorIds = follows.map((f) => f.creatorId);

    // Build query conditions
    // - Content from subscribed creators: ALL published content
    // - Content from followed (not subscribed) creators: Only FREE published content
    const whereConditions = [];

    if (subscribedCreatorIds.length > 0) {
      whereConditions.push({
        creatorId: { in: subscribedCreatorIds },
        status: "published" as const,
        publishedAt: { not: null },
      });
    }

    if (followedOnlyCreatorIds.length > 0) {
      whereConditions.push({
        creatorId: { in: followedOnlyCreatorIds },
        status: "published" as const,
        publishedAt: { not: null },
        isFree: true,
      });
    }

    // If user has no subscriptions or follows, show promotional/discovery content
    // This includes free content from featured creators and recent free content from all creators
    if (whereConditions.length === 0) {
      // Fetch promotional content: free published content from active creators
      // Prioritize featured creators, then sort by recency
      const promotionalContent = await prisma.content.findMany({
        where: {
          status: "published",
          publishedAt: { not: null },
          isFree: true,
          creator: {
            status: "active",
            stripeOnboardingComplete: true,
          },
        },
        take: limit + 1,
        ...(cursor
          ? {
              cursor: { id: cursor },
              skip: 1,
            }
          : {}),
        orderBy: [
          { creator: { isFeatured: "desc" } },
          { publishedAt: "desc" },
        ],
        include: {
          creator: {
            select: {
              id: true,
              handle: true,
              displayName: true,
              avatarUrl: true,
              category: true,
              isFeatured: true,
            },
          },
        },
      });

      const hasMore = promotionalContent.length > limit;
      const items = hasMore ? promotionalContent.slice(0, limit) : promotionalContent;
      const nextCursor = hasMore ? items[items.length - 1].id : null;

      const formattedItems = items.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        thumbnailUrl: item.thumbnailUrl,
        duration: item.duration,
        isFree: item.isFree,
        hasAccess: true, // All promotional content is free, so user has access
        publishedAt: item.publishedAt?.toISOString() || null,
        creator: {
          id: item.creator.id,
          handle: item.creator.handle,
          displayName: item.creator.displayName,
          avatarUrl: item.creator.avatarUrl,
          category: item.creator.category,
        },
        isPromotional: true, // Flag to indicate this is discovery content
      }));

      // Only return isEmpty: true if there's truly no content at all
      return NextResponse.json({
        items: formattedItems,
        nextCursor,
        isEmpty: formattedItems.length === 0,
        isPromotional: true, // Indicates this is discovery content, not personalized feed
      });
    }

    // Fetch content with cursor-based pagination
    const content = await prisma.content.findMany({
      where: {
        OR: whereConditions,
      },
      take: limit + 1, // Fetch one extra to determine if there's more
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1, // Skip the cursor item
          }
        : {}),
      orderBy: { publishedAt: "desc" },
      include: {
        creator: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatarUrl: true,
            category: true,
          },
        },
      },
    });

    // Check if there are more results
    const hasMore = content.length > limit;
    const items = hasMore ? content.slice(0, limit) : content;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // Determine access level for each item
    const formattedItems = items.map((item) => {
      const isSubscribed = subscribedCreatorIds.includes(item.creatorId);
      const hasAccess = item.isFree || isSubscribed;

      return {
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        thumbnailUrl: item.thumbnailUrl,
        duration: item.duration,
        isFree: item.isFree,
        hasAccess,
        publishedAt: item.publishedAt?.toISOString() || null,
        creator: {
          id: item.creator.id,
          handle: item.creator.handle,
          displayName: item.creator.displayName,
          avatarUrl: item.creator.avatarUrl,
          category: item.creator.category,
        },
      };
    });

    return NextResponse.json({
      items: formattedItems,
      nextCursor,
      isEmpty: false,
    });
  } catch (error) {
    console.error("Error fetching feed:", error);
    return NextResponse.json(
      { error: "Failed to fetch feed", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
