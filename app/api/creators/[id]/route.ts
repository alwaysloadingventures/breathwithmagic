import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

/**
 * Creator Details API Route
 *
 * GET /api/creators/[id]
 *
 * Returns detailed information about a specific creator.
 * The id parameter can be either the creator's ID or handle.
 * Public endpoint - no authentication required.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Try to find by ID first, then by handle
    const creator = await prisma.creatorProfile.findFirst({
      where: {
        OR: [{ id }, { handle: id }],
        status: "active",
        stripeOnboardingComplete: true,
      },
      select: {
        id: true,
        handle: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        coverImageUrl: true,
        category: true,
        subscriptionPrice: true,
        trialEnabled: true,
        dmEnabled: true,
        isVerified: true,
        isFeatured: true,
        createdAt: true,
        _count: {
          select: {
            subscriptions: {
              where: {
                status: { in: ["active", "trialing"] },
              },
            },
            content: {
              where: {
                status: "published",
              },
            },
            followers: true,
          },
        },
      },
    });

    if (!creator) {
      return NextResponse.json(
        {
          error: "Creator not found",
          code: "NOT_FOUND",
        },
        { status: 404 },
      );
    }

    // Get content count by type
    const contentCounts = await prisma.content.groupBy({
      by: ["type"],
      where: {
        creatorId: creator.id,
        status: "published",
      },
      _count: true,
    });

    const contentByType = contentCounts.reduce(
      (acc, item) => {
        acc[item.type] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return NextResponse.json({
      id: creator.id,
      handle: creator.handle,
      displayName: creator.displayName,
      bio: creator.bio,
      avatarUrl: creator.avatarUrl,
      coverImageUrl: creator.coverImageUrl,
      category: creator.category,
      subscriptionPrice: creator.subscriptionPrice,
      trialEnabled: creator.trialEnabled,
      dmEnabled: creator.dmEnabled,
      isVerified: creator.isVerified,
      isFeatured: creator.isFeatured,
      createdAt: creator.createdAt,
      stats: {
        subscriberCount: creator._count.subscriptions,
        contentCount: creator._count.content,
        followerCount: creator._count.followers,
        contentByType,
      },
    });
  } catch (error) {
    console.error("Creator details error:", error);
    return NextResponse.json(
      {
        error:
          "An error occurred while fetching creator details. Please try again.",
        code: "FETCH_ERROR",
      },
      { status: 500 },
    );
  }
}
