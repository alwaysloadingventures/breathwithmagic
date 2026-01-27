import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/redis";

/**
 * Search API Route
 *
 * GET /api/search?q=<query>&type=creators|content|all&limit=20&cursor=<cursor>
 *
 * Rate limit: 30 requests/minute
 */

const searchSchema = z.object({
  q: z.string().min(1).max(100),
  type: z.enum(["creators", "content", "all"]).default("all"),
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const parseResult = searchSchema.safeParse({
      q: searchParams.get("q"),
      type: searchParams.get("type") ?? "all",
      limit: searchParams.get("limit") ?? 20,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid search parameters",
          code: "INVALID_PARAMS",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { q, type, limit, cursor } = parseResult.data;

    // Rate limiting - use IP as identifier for anonymous users
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "anonymous";

    const rateLimitResult = await rateLimit(`search:${ip}`, 30, 60_000);

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
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rateLimitResult.resetAt),
            "Retry-After": String(
              Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
            ),
          },
        },
      );
    }

    // Prepare search term for database query
    const searchTerm = q.toLowerCase().trim();

    // Results containers
    let creators: Array<{
      id: string;
      handle: string;
      displayName: string;
      bio: string | null;
      avatarUrl: string | null;
      coverImageUrl: string | null;
      category: string;
      subscriptionPrice: string;
      trialEnabled: boolean;
      isVerified: boolean;
    }> = [];
    let content: Array<{
      id: string;
      title: string;
      description: string | null;
      thumbnailUrl: string | null;
      type: string;
      duration: number | null;
      isFree: boolean;
      publishedAt: Date | null;
      creator: {
        handle: string;
        displayName: string;
        avatarUrl: string | null;
      };
    }> = [];
    let creatorsNextCursor: string | null = null;
    let contentNextCursor: string | null = null;

    // Search creators
    if (type === "creators" || type === "all") {
      const creatorResults = await prisma.creatorProfile.findMany({
        where: {
          status: "active",
          stripeOnboardingComplete: true,
          OR: [
            { displayName: { contains: searchTerm, mode: "insensitive" } },
            { handle: { contains: searchTerm, mode: "insensitive" } },
            { bio: { contains: searchTerm, mode: "insensitive" } },
          ],
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
          isVerified: true,
        },
        orderBy: [{ isFeatured: "desc" }, { displayName: "asc" }],
        take: limit + 1,
        ...(cursor && {
          cursor: { id: cursor },
          skip: 1,
        }),
      });

      if (creatorResults.length > limit) {
        creatorsNextCursor = creatorResults[limit - 1].id;
        creators = creatorResults.slice(0, limit);
      } else {
        creators = creatorResults;
      }
    }

    // Search content (only published and public content)
    if (type === "content" || type === "all") {
      const contentResults = await prisma.content.findMany({
        where: {
          status: "published",
          OR: [
            { title: { contains: searchTerm, mode: "insensitive" } },
            { description: { contains: searchTerm, mode: "insensitive" } },
          ],
          creator: {
            status: "active",
            stripeOnboardingComplete: true,
          },
        },
        select: {
          id: true,
          title: true,
          description: true,
          thumbnailUrl: true,
          type: true,
          duration: true,
          isFree: true,
          publishedAt: true,
          creator: {
            select: {
              handle: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { publishedAt: "desc" },
        take: limit + 1,
        ...(cursor &&
          type === "content" && {
            cursor: { id: cursor },
            skip: 1,
          }),
      });

      if (contentResults.length > limit) {
        contentNextCursor = contentResults[limit - 1].id;
        content = contentResults.slice(0, limit);
      } else {
        content = contentResults;
      }
    }

    return NextResponse.json(
      {
        creators:
          type === "creators" || type === "all"
            ? {
                items: creators,
                nextCursor: creatorsNextCursor,
              }
            : undefined,
        content:
          type === "content" || type === "all"
            ? {
                items: content,
                nextCursor: contentNextCursor,
              }
            : undefined,
        query: q,
      },
      {
        headers: {
          "X-RateLimit-Limit": "30",
          "X-RateLimit-Remaining": String(rateLimitResult.remaining),
          "X-RateLimit-Reset": String(rateLimitResult.resetAt),
        },
      },
    );
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      {
        error: "An error occurred while searching. Please try again.",
        code: "SEARCH_ERROR",
      },
      { status: 500 },
    );
  }
}
