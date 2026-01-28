/**
 * GET /api/content/[id]
 *
 * Get a single content item by ID.
 * Performs access check to determine if user can view full content.
 *
 * Returns:
 * - Full content if user has access (free content or subscribed)
 * - Limited content with hasAccess: false if paywalled
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { apiRateLimiter } from "@/lib/rate-limit";
import {
  getCachedSubscriptionStatus,
  setCachedSubscriptionStatus,
} from "@/lib/cache";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id: contentId } = await params;

    // Rate limit check (uses IP for unauthenticated, userId for authenticated)
    const { userId: clerkId } = await auth();
    const rateLimitKey =
      clerkId || request.headers.get("x-forwarded-for") || "anonymous";
    const rateLimitResult = apiRateLimiter.check(rateLimitKey);

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

    // Fetch content with creator info
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: {
        creator: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatarUrl: true,
            category: true,
            subscriptionPrice: true,
            trialEnabled: true,
            status: true,
          },
        },
        program: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!content) {
      return NextResponse.json(
        { error: "Content not found", code: "CONTENT_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Check if content is published and creator is active
    if (content.status !== "published" || content.creator.status !== "active") {
      return NextResponse.json(
        { error: "Content not available", code: "CONTENT_UNAVAILABLE" },
        { status: 404 },
      );
    }

    // Determine access level
    let hasAccess = content.isFree;
    let isSubscribed = false;
    let isFollowing = false;

    if (clerkId) {
      const user = await prisma.user.findUnique({
        where: { clerkId },
        select: { id: true },
      });

      if (user) {
        // Check cached subscription status first
        const cachedStatus = await getCachedSubscriptionStatus(
          user.id,
          content.creatorId,
        );

        if (cachedStatus !== null) {
          isSubscribed = cachedStatus.isSubscribed;
        } else {
          // Query database for subscription status
          const subscription = await prisma.subscription.findFirst({
            where: {
              userId: user.id,
              creatorId: content.creatorId,
              status: { in: ["active", "trialing"] },
            },
          });
          isSubscribed = !!subscription;

          // Cache the result
          await setCachedSubscriptionStatus(user.id, content.creatorId, {
            isSubscribed,
            status: subscription?.status || null,
          });
        }

        // Check if following
        const follow = await prisma.follow.findUnique({
          where: {
            userId_creatorId: {
              userId: user.id,
              creatorId: content.creatorId,
            },
          },
        });
        isFollowing = !!follow;

        // User has access if content is free OR they're subscribed
        hasAccess = content.isFree || isSubscribed;
      }
    }

    // Price tier mapping
    const PRICE_DISPLAY: Record<string, { amount: string; cents: number }> = {
      TIER_500: { amount: "$5", cents: 500 },
      TIER_1000: { amount: "$10", cents: 1000 },
      TIER_2000: { amount: "$20", cents: 2000 },
      TIER_3000: { amount: "$30", cents: 3000 },
    };

    const price = PRICE_DISPLAY[content.creator.subscriptionPrice];

    // Build response based on access level
    const baseResponse = {
      id: content.id,
      type: content.type,
      title: content.title,
      description: content.description,
      thumbnailUrl: content.thumbnailUrl,
      duration: content.duration,
      isFree: content.isFree,
      publishedAt: content.publishedAt?.toISOString() || null,
      hasAccess,
      isSubscribed,
      isFollowing,
      creator: {
        id: content.creator.id,
        handle: content.creator.handle,
        displayName: content.creator.displayName,
        avatarUrl: content.creator.avatarUrl,
        category: content.creator.category,
        subscriptionPrice: price,
        trialEnabled: content.creator.trialEnabled,
      },
      program: content.program
        ? {
            id: content.program.id,
            title: content.program.title,
          }
        : null,
    };

    // If user has access, include media URL
    if (hasAccess) {
      return NextResponse.json({
        ...baseResponse,
        mediaUrl: content.mediaUrl,
      });
    }

    // If no access, return limited content (no mediaUrl)
    return NextResponse.json(baseResponse);
  } catch (error) {
    console.error("Error fetching content:", error);
    return NextResponse.json(
      { error: "Failed to fetch content", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
