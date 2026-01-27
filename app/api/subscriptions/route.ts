/**
 * GET /api/subscriptions
 *
 * List the authenticated user's active subscriptions.
 * Returns subscriptions with creator details for display.
 *
 * Query Parameters:
 * - cursor: Pagination cursor (last subscription ID)
 * - limit: Number of results (1-100, default 20)
 * - status: Filter by status (active, trialing, past_due, canceled)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { subscriptionListQuerySchema } from "@/lib/validations/subscription";
import { apiRateLimiter } from "@/lib/rate-limit";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(
        {
          error: "Please sign in to view your subscriptions",
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

    // Get the user
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryResult = subscriptionListQuerySchema.safeParse({
      cursor: searchParams.get("cursor") || undefined,
      limit: searchParams.get("limit") || undefined,
      status: searchParams.get("status") || undefined,
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

    const { cursor, limit, status } = queryResult.data;

    // Build where clause
    const where = {
      userId: user.id,
      ...(status ? { status } : {}),
    };

    // Fetch subscriptions with cursor-based pagination
    const subscriptions = await prisma.subscription.findMany({
      where,
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
            category: true,
            subscriptionPrice: true,
          },
        },
      },
    });

    // Check if there are more results
    const hasMore = subscriptions.length > limit;
    const items = hasMore ? subscriptions.slice(0, limit) : subscriptions;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // Format response
    const formattedItems = items.map((sub) => ({
      id: sub.id,
      status: sub.status,
      priceAtPurchase: sub.priceAtPurchase,
      currentPeriodStart: sub.currentPeriodStart?.toISOString() || null,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() || null,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      createdAt: sub.createdAt.toISOString(),
      creator: {
        id: sub.creator.id,
        handle: sub.creator.handle,
        displayName: sub.creator.displayName,
        avatarUrl: sub.creator.avatarUrl,
        category: sub.creator.category,
        currentPrice: sub.creator.subscriptionPrice,
      },
    }));

    return NextResponse.json({
      items: formattedItems,
      nextCursor,
    });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscriptions", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
