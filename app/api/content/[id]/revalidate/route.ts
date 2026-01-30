/**
 * GET /api/content/[id]/revalidate
 *
 * Revalidates user access to content during playback.
 * Called periodically by the video/audio player to ensure continued access.
 *
 * This endpoint:
 * - Checks if user still has an active subscription
 * - Returns validity status and time until next check
 * - Used for long videos to catch subscription expirations mid-playback
 *
 * Response:
 * - 200: { valid: boolean, expiresIn: number, nextCheckIn: number }
 * - 401: Unauthenticated
 * - 404: Content not found
 * - 429: Rate limited
 *
 * Security Note:
 * - Errors fail CLOSED (valid: false) to prevent access continuation on server failures
 * - Clients can retry with exponential backoff using retryAfter and maxRetries fields
 *
 * @see PRD Phase 3, Task 12: Paywall Enforcement
 */

interface RevalidateResponse {
  valid: boolean;
  expiresIn: number;
  nextCheckIn: number;
  reason?: string;
  retryable?: boolean;
  retryAfter?: number;
  maxRetries?: number;
  error?: string;
  code?: string;
  creator?: {
    id: string;
    handle: string;
    displayName: string;
    avatarUrl?: string;
    subscriptionPrice?: { amount: string; cents: number };
    trialEnabled: boolean;
  };
  acknowledged?: {
    playbackPosition?: number;
    sessionId?: string;
  };
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { apiRateLimiter } from "@/lib/rate-limit";
import { revalidateAccess } from "@/lib/middleware/subscription-check";

// Price display mapping
const PRICE_DISPLAY: Record<string, { amount: string; cents: number }> = {
  TIER_FREE: { amount: "Free", cents: 0 },
  TIER_500: { amount: "$5", cents: 500 },
  TIER_1000: { amount: "$10", cents: 1000 },
  TIER_1500: { amount: "$15", cents: 1500 },
  TIER_2000: { amount: "$20", cents: 2000 },
  TIER_2500: { amount: "$25", cents: 2500 },
  TIER_3000: { amount: "$30", cents: 3000 },
  TIER_4000: { amount: "$40", cents: 4000 },
  TIER_5000: { amount: "$50", cents: 5000 },
  TIER_7500: { amount: "$75", cents: 7500 },
  TIER_9900: { amount: "$99", cents: 9900 },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id: contentId } = await params;

    // Authentication required for revalidation
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        {
          error: "Authentication required",
          code: "UNAUTHENTICATED",
          valid: false,
          expiresIn: 0,
          nextCheckIn: 0,
        },
        { status: 401 },
      );
    }

    // Rate limit - slightly higher limit for revalidation calls
    // since they're automated and essential for playback
    const rateLimitKey = `revalidate:${clerkId}`;
    const rateLimitResult = apiRateLimiter.check(rateLimitKey);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          code: "RATE_LIMITED",
          valid: false, // Fail closed - don't allow access during rate limit
          retryable: true,
          retryAfter: Math.max(10, rateLimitResult.retryAfterSeconds || 10),
          maxRetries: 3,
          expiresIn: 0,
          nextCheckIn: Math.max(10, rateLimitResult.retryAfterSeconds || 10),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfterSeconds),
          },
        },
      );
    }

    // Get internal user ID
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: "User not found",
          code: "USER_NOT_FOUND",
          valid: false,
          expiresIn: 0,
          nextCheckIn: 0,
        },
        { status: 404 },
      );
    }

    // Perform fresh revalidation (bypasses cache for accuracy)
    const result = await revalidateAccess(user.id, contentId);

    // If access is revoked, include paywall info
    if (!result.valid) {
      // Get content to find creator
      const content = await prisma.content.findUnique({
        where: { id: contentId },
        include: {
          creator: {
            select: {
              id: true,
              handle: true,
              displayName: true,
              avatarUrl: true,
              subscriptionPrice: true,
              trialEnabled: true,
            },
          },
        },
      });

      if (content) {
        const price = PRICE_DISPLAY[content.creator.subscriptionPrice];

        return NextResponse.json(
          {
            valid: false,
            reason: result.reason,
            expiresIn: 0,
            nextCheckIn: 0,
            creator: {
              id: content.creator.id,
              handle: content.creator.handle,
              displayName: content.creator.displayName,
              avatarUrl: content.creator.avatarUrl,
              subscriptionPrice: price,
              trialEnabled: content.creator.trialEnabled,
            },
          },
          { status: 200 },
        );
      }

      return NextResponse.json(
        {
          valid: false,
          reason: result.reason,
          expiresIn: 0,
          nextCheckIn: 0,
        },
        { status: 200 },
      );
    }

    // Access is valid
    const response: RevalidateResponse = {
      valid: true,
      reason: result.reason,
      expiresIn: result.expiresIn,
      nextCheckIn: result.nextCheckIn,
    };

    return NextResponse.json(response, {
      headers: {
        // Suggest when client should make next revalidation call
        "X-Next-Check-In": String(result.nextCheckIn),
        // Don't cache revalidation responses
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error revalidating content access:", error);
    // SECURITY: Fail closed to prevent access continuation on server errors
    const errorResponse: RevalidateResponse = {
      error: "Failed to revalidate access",
      code: "SERVER_ERROR",
      valid: false, // Fail closed for security
      retryable: true, // Client should retry
      retryAfter: 10, // Suggest retry in 10 seconds
      maxRetries: 3, // Allow 3 retries before stopping
      expiresIn: 0,
      nextCheckIn: 10,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST /api/content/[id]/revalidate
 *
 * Alternative method that accepts additional context in the body.
 * Useful for including current playback position or session info.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id: contentId } = await params;

    // Authentication required
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        {
          error: "Authentication required",
          code: "UNAUTHENTICATED",
          valid: false,
          expiresIn: 0,
          nextCheckIn: 0,
        },
        { status: 401 },
      );
    }

    // Parse request body for additional context
    let playbackPosition: number | undefined;
    let sessionId: string | undefined;

    try {
      const body = await request.json();
      playbackPosition = body.playbackPosition;
      sessionId = body.sessionId;
    } catch {
      // Body is optional
    }

    // Rate limit
    const rateLimitKey = `revalidate:${clerkId}`;
    const rateLimitResult = apiRateLimiter.check(rateLimitKey);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests",
          code: "RATE_LIMITED",
          valid: false, // Fail closed - don't allow access during rate limit
          retryable: true,
          retryAfter: Math.max(10, rateLimitResult.retryAfterSeconds || 10),
          maxRetries: 3,
          expiresIn: 0,
          nextCheckIn: Math.max(10, rateLimitResult.retryAfterSeconds || 10),
        },
        { status: 429 },
      );
    }

    // Get internal user ID
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: "User not found",
          code: "USER_NOT_FOUND",
          valid: false,
          expiresIn: 0,
          nextCheckIn: 0,
        },
        { status: 404 },
      );
    }

    // Perform fresh revalidation
    const result = await revalidateAccess(user.id, contentId);

    // Log playback progress if provided (for analytics)
    if (playbackPosition !== undefined && result.valid) {
      // Fire-and-forget progress update
      // This is non-blocking to avoid slowing down revalidation
      updatePlaybackProgress(user.id, contentId, playbackPosition).catch(
        (err) => {
          console.error("Failed to update playback progress:", err);
        },
      );
    }

    if (!result.valid) {
      const content = await prisma.content.findUnique({
        where: { id: contentId },
        include: {
          creator: {
            select: {
              id: true,
              handle: true,
              displayName: true,
              subscriptionPrice: true,
              trialEnabled: true,
            },
          },
        },
      });

      return NextResponse.json({
        valid: false,
        reason: result.reason,
        expiresIn: 0,
        nextCheckIn: 0,
        creator: content
          ? {
              id: content.creator.id,
              handle: content.creator.handle,
              displayName: content.creator.displayName,
              subscriptionPrice:
                PRICE_DISPLAY[content.creator.subscriptionPrice],
              trialEnabled: content.creator.trialEnabled,
            }
          : undefined,
      });
    }

    return NextResponse.json({
      valid: true,
      reason: result.reason,
      expiresIn: result.expiresIn,
      nextCheckIn: result.nextCheckIn,
      acknowledged: {
        playbackPosition,
        sessionId,
      },
    });
  } catch (error) {
    console.error("Error in POST revalidate:", error);
    // SECURITY: Fail closed to prevent access continuation on server errors
    const errorResponse: RevalidateResponse = {
      error: "Failed to revalidate access",
      code: "SERVER_ERROR",
      valid: false, // Fail closed for security
      retryable: true, // Client should retry
      retryAfter: 10, // Suggest retry in 10 seconds
      maxRetries: 3, // Allow 3 retries before stopping
      expiresIn: 0,
      nextCheckIn: 10,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * Update playback progress in the database
 * Called asynchronously during revalidation
 */
async function updatePlaybackProgress(
  userId: string,
  contentId: string,
  position: number,
): Promise<void> {
  // Get content duration to check for completion
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: { duration: true },
  });

  // Find existing view
  const existingView = await prisma.contentView.findFirst({
    where: {
      userId,
      contentId,
    },
  });

  if (existingView) {
    // Update existing view
    await prisma.contentView.update({
      where: { id: existingView.id },
      data: {
        watchDuration: Math.max(
          existingView.watchDuration ?? 0,
          Math.floor(position),
        ),
        completedAt:
          content?.duration && position >= content.duration * 0.9
            ? new Date()
            : existingView.completedAt,
      },
    });
  } else {
    // Create new view
    await prisma.contentView.create({
      data: {
        userId,
        contentId,
        watchDuration: Math.floor(position),
      },
    });
  }
}
