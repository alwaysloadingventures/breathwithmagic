/**
 * /api/creator/content
 *
 * POST - Create new content
 * GET - List creator's content with filters and pagination
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  createContentSchema,
  contentListQuerySchema,
} from "@/lib/validations/content";
import { uploadRateLimiter } from "@/lib/rate-limit";
import { sanitizeHtml } from "@/lib/sanitize";
import { sendNewContentEmailsToSubscribers } from "@/lib/email";
import { notifyNewContent } from "@/lib/notifications";

/**
 * POST /api/creator/content
 *
 * Create new content for a creator
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // Check rate limit (PRD: 10 uploads per hour)
    const { allowed, remaining, retryAfterSeconds } =
      uploadRateLimiter.check(clerkId);
    if (!allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "10",
            "X-RateLimit-Remaining": String(remaining),
            "Retry-After": String(retryAfterSeconds || 3600),
          },
        },
      );
    }

    // Get user and creator profile (include displayName for notifications)
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        creatorProfile: {
          select: { id: true, status: true, displayName: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 },
      );
    }

    if (!user.creatorProfile) {
      return NextResponse.json(
        { error: "Creator profile not found", code: "NOT_CREATOR" },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = createContentSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: parseResult.error.issues[0].message,
          code: "VALIDATION_ERROR",
          details: parseResult.error.issues,
        },
        { status: 400 },
      );
    }

    const data = parseResult.data;

    // If programId is provided, verify it belongs to this creator
    if (data.programId) {
      const program = await prisma.program.findFirst({
        where: {
          id: data.programId,
          creatorId: user.creatorProfile.id,
        },
      });

      if (!program) {
        return NextResponse.json(
          { error: "Program not found", code: "PROGRAM_NOT_FOUND" },
          { status: 404 },
        );
      }
    }

    // Sanitize description if present (PRD: DOMPurify for user-generated content)
    const sanitizedDescription = data.description
      ? sanitizeHtml(data.description)
      : null;

    // Create the content
    const content = await prisma.content.create({
      data: {
        creatorId: user.creatorProfile.id,
        type: data.type,
        title: data.title,
        description: sanitizedDescription,
        mediaUrl: data.mediaUrl || null,
        thumbnailUrl: data.thumbnailUrl || null,
        duration: data.duration || null,
        isFree: data.isFree,
        status: data.status,
        programId: data.programId || null,
        sortOrder: data.sortOrder || null,
        publishedAt: data.status === "published" ? new Date() : null,
      },
    });

    // Send notifications if published directly (fire and forget - don't block response)
    if (data.status === "published") {
      const creatorId = user.creatorProfile.id;
      const creatorName = user.creatorProfile.displayName;
      const contentTitle = content.title;
      const contentId = content.id;

      // Send in-app notifications
      notifyNewContent(creatorId, creatorName, contentTitle, contentId).catch(
        (error) =>
          console.error("Error sending new content in-app notifications:", error),
      );

      // Send email notifications
      sendNewContentEmailsToSubscribers(
        creatorId,
        creatorName,
        contentTitle,
        contentId,
      ).catch((error) =>
        console.error("Error sending new content email notifications:", error),
      );
    }

    return NextResponse.json({
      success: true,
      content: {
        id: content.id,
        type: content.type,
        title: content.title,
        description: content.description,
        mediaUrl: content.mediaUrl,
        thumbnailUrl: content.thumbnailUrl,
        duration: content.duration,
        isFree: content.isFree,
        status: content.status,
        programId: content.programId,
        sortOrder: content.sortOrder,
        publishedAt: content.publishedAt,
        createdAt: content.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating content:", error);
    return NextResponse.json(
      { error: "Failed to create content", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/creator/content
 *
 * List creator's content with filters and cursor-based pagination
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryResult = contentListQuerySchema.safeParse({
      status: searchParams.get("status") || undefined,
      type: searchParams.get("type") || undefined,
      programId: searchParams.get("programId") || undefined,
      cursor: searchParams.get("cursor") || undefined,
      limit: searchParams.get("limit") || 20,
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

    const { status, type, programId, cursor, limit } = queryResult.data;

    // Build where clause
    const where: Prisma.ContentWhereInput = {
      creatorId: user.creatorProfile.id,
    };

    // Filter by status (default: exclude deleted)
    if (status) {
      where.status = status;
    } else {
      // By default, don't show deleted content
      where.status = { not: "deleted" };
    }

    if (type) {
      where.type = type;
    }

    if (programId) {
      where.programId = programId;
    }

    // Fetch content with cursor-based pagination
    const content = await prisma.content.findMany({
      where,
      take: limit + 1, // Fetch one extra to determine if there's a next page
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0, // Skip the cursor item
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        program: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Determine if there's a next page
    const hasNextPage = content.length > limit;
    const items = hasNextPage ? content.slice(0, limit) : content;
    const nextCursor = hasNextPage ? items[items.length - 1]?.id : null;

    return NextResponse.json({
      items: items.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        mediaUrl: item.mediaUrl,
        thumbnailUrl: item.thumbnailUrl,
        duration: item.duration,
        isFree: item.isFree,
        status: item.status,
        programId: item.programId,
        program: item.program,
        sortOrder: item.sortOrder,
        publishedAt: item.publishedAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      nextCursor,
    });
  } catch (error) {
    console.error("Error listing content:", error);
    return NextResponse.json(
      { error: "Failed to list content", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
