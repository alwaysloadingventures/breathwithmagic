import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CreatorCategory } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Creators List API Route
 *
 * GET /api/creators?limit=20&cursor=<cursor>&category=<category>&featured=<boolean>
 *
 * Returns paginated list of active creators with their profiles.
 * Public endpoint - no authentication required.
 */

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  category: z.nativeEnum(CreatorCategory).optional(),
  featured: z.enum(["true", "false"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const parseResult = querySchema.safeParse({
      limit: searchParams.get("limit") ?? 20,
      cursor: searchParams.get("cursor") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      featured: searchParams.get("featured") ?? undefined,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          code: "INVALID_PARAMS",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { limit, cursor, category, featured } = parseResult.data;

    // Build where clause
    const where: {
      status: "active";
      stripeOnboardingComplete: true;
      category?: CreatorCategory;
      isFeatured?: boolean;
    } = {
      status: "active",
      stripeOnboardingComplete: true,
    };

    if (category) {
      where.category = category;
    }

    if (featured !== undefined) {
      where.isFeatured = featured === "true";
    }

    // Fetch creators with pagination
    const creators = await prisma.creatorProfile.findMany({
      where,
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
        isVerified: true,
        isFeatured: true,
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
          },
        },
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    // Determine if there are more results
    let nextCursor: string | null = null;
    if (creators.length > limit) {
      nextCursor = creators[limit - 1].id;
      creators.pop();
    }

    // Transform response
    const items = creators.map((creator) => ({
      id: creator.id,
      handle: creator.handle,
      displayName: creator.displayName,
      bio: creator.bio,
      avatarUrl: creator.avatarUrl,
      coverImageUrl: creator.coverImageUrl,
      category: creator.category,
      subscriptionPrice: creator.subscriptionPrice,
      trialEnabled: creator.trialEnabled,
      isVerified: creator.isVerified,
      isFeatured: creator.isFeatured,
      subscriberCount: creator._count.subscriptions,
      contentCount: creator._count.content,
    }));

    return NextResponse.json({
      items,
      nextCursor,
    });
  } catch (error) {
    console.error("Creators list error:", error);
    return NextResponse.json(
      {
        error: "An error occurred while fetching creators. Please try again.",
        code: "FETCH_ERROR",
      },
      { status: 500 },
    );
  }
}
