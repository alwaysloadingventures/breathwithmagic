import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

/**
 * Creator Content API Route
 *
 * GET /api/creators/[id]/content?limit=20&cursor=<cursor>&type=<type>
 *
 * Returns paginated list of creator's content.
 * - Free content is always visible
 * - Paid content is visible but marked as locked unless user has subscription
 *
 * Public endpoint - authentication optional (affects access status).
 */

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  type: z.enum(["video", "audio", "text"]).optional(),
  freeOnly: z.enum(["true", "false"]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const parseResult = querySchema.safeParse({
      limit: searchParams.get("limit") ?? 20,
      cursor: searchParams.get("cursor") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      freeOnly: searchParams.get("freeOnly") ?? undefined,
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

    const { limit, cursor, type, freeOnly } = parseResult.data;

    // Find the creator
    const creator = await prisma.creatorProfile.findFirst({
      where: {
        OR: [{ id }, { handle: id }],
        status: "active",
      },
      select: {
        id: true,
        handle: true,
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

    // Check if user is authenticated and has subscription
    let hasAccess = false;
    const { userId } = await auth();

    if (userId) {
      // Find user in database
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true },
      });

      if (user) {
        // Check for active subscription
        const subscription = await prisma.subscription.findFirst({
          where: {
            userId: user.id,
            creatorId: creator.id,
            status: { in: ["active", "trialing"] },
          },
        });

        hasAccess = !!subscription;
      }
    }

    // Build where clause
    const where: {
      creatorId: string;
      status: "published";
      type?: "video" | "audio" | "text";
      isFree?: boolean;
    } = {
      creatorId: creator.id,
      status: "published",
    };

    if (type) {
      where.type = type;
    }

    if (freeOnly === "true") {
      where.isFree = true;
    }

    // Fetch content with pagination
    const content = await prisma.content.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        type: true,
        duration: true,
        isFree: true,
        publishedAt: true,
        createdAt: true,
      },
      orderBy: { publishedAt: "desc" },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    // Determine if there are more results
    let nextCursor: string | null = null;
    if (content.length > limit) {
      nextCursor = content[limit - 1].id;
      content.pop();
    }

    // Transform response - add access information
    const items = content.map((item) => ({
      id: item.id,
      title: item.title,
      // Only include full description if user has access or content is free
      description:
        item.isFree || hasAccess
          ? item.description
          : item.description?.substring(0, 100) + "...",
      thumbnailUrl: item.thumbnailUrl,
      type: item.type,
      duration: item.duration,
      isFree: item.isFree,
      hasAccess: item.isFree || hasAccess,
      publishedAt: item.publishedAt,
    }));

    // Get counts for response metadata
    const totalCount = await prisma.content.count({
      where: {
        creatorId: creator.id,
        status: "published",
      },
    });

    const freeCount = await prisma.content.count({
      where: {
        creatorId: creator.id,
        status: "published",
        isFree: true,
      },
    });

    return NextResponse.json({
      items,
      nextCursor,
      meta: {
        creatorHandle: creator.handle,
        totalCount,
        freeCount,
        paidCount: totalCount - freeCount,
        hasSubscription: hasAccess,
      },
    });
  } catch (error) {
    console.error("Creator content error:", error);
    return NextResponse.json(
      {
        error: "An error occurred while fetching content. Please try again.",
        code: "FETCH_ERROR",
      },
      { status: 500 },
    );
  }
}
