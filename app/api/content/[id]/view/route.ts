/**
 * POST /api/content/[id]/view
 *
 * Record a content view and update watch progress.
 * Used for analytics and progress tracking.
 *
 * Features:
 * - Creates a view record if none exists for this user-content pair
 * - Updates watchDuration (debounced client-side, called every 30 seconds)
 * - Marks content as completed when watchDuration >= duration
 * - Uses Redis-based debouncing to prevent spam
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { recordContentViewSchema } from "@/lib/validations/feed";
import { redis } from "@/lib/cache";

// Debounce key TTL in seconds (prevent duplicate view records)
const VIEW_DEBOUNCE_TTL = 60; // 1 minute

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id: contentId } = await params;

    // Verify authentication
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(
        {
          error: "Please sign in to track progress",
          code: "UNAUTHORIZED",
        },
        { status: 401 },
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

    // Parse request body
    const body = await request.json();
    const parseResult = recordContentViewSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: parseResult.error.issues[0].message,
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    const { watchDuration, completed } = parseResult.data;

    // Verify content exists and user has access
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      select: {
        id: true,
        creatorId: true,
        isFree: true,
        status: true,
        duration: true,
      },
    });

    if (!content || content.status !== "published") {
      return NextResponse.json(
        { error: "Content not found", code: "CONTENT_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Check if user has access to this content
    let hasAccess = content.isFree;

    if (!hasAccess) {
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId: user.id,
          creatorId: content.creatorId,
          status: { in: ["active", "trialing"] },
        },
      });
      hasAccess = !!subscription;
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied", code: "ACCESS_DENIED" },
        { status: 403 },
      );
    }

    // Check Redis debounce for new view creation (not for progress updates)
    const debounceKey = `view:${user.id}:${contentId}`;
    const isNewViewDebounced = redis ? await redis.get(debounceKey) : null;

    // Find or create view record
    let view = await prisma.contentView.findFirst({
      where: {
        userId: user.id,
        contentId: contentId,
      },
      orderBy: { createdAt: "desc" },
    });

    // Only create a new view if not debounced and no existing view
    if (!view && !isNewViewDebounced) {
      view = await prisma.contentView.create({
        data: {
          userId: user.id,
          contentId: contentId,
          watchDuration: watchDuration || 0,
          completedAt: completed ? new Date() : null,
        },
      });

      // Set debounce key in Redis
      if (redis) {
        await redis.set(debounceKey, "1", { ex: VIEW_DEBOUNCE_TTL });
      }
    } else if (view) {
      // Update existing view with new progress
      const shouldMarkComplete =
        completed ||
        (watchDuration &&
          content.duration &&
          watchDuration >= content.duration * 0.9); // 90% completion

      view = await prisma.contentView.update({
        where: { id: view.id },
        data: {
          watchDuration:
            watchDuration !== undefined
              ? Math.max(view.watchDuration || 0, watchDuration)
              : view.watchDuration,
          completedAt:
            shouldMarkComplete && !view.completedAt
              ? new Date()
              : view.completedAt,
        },
      });
    }

    return NextResponse.json({
      success: true,
      viewId: view?.id || null,
      watchDuration: view?.watchDuration || 0,
      completed: !!view?.completedAt,
    });
  } catch (error) {
    console.error("Error recording content view:", error);
    return NextResponse.json(
      { error: "Failed to record view", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
