/**
 * /api/messages/broadcast
 *
 * POST - Creator sends a broadcast message to all their subscribers
 *
 * PRD Requirements:
 * - Creator can send message to ALL their subscribers at once
 * - isBroadcast: true for broadcast messages
 * - Message appears in each subscriber's inbox
 * - Rate limit: 30 messages/hour for creators
 * - Content sanitization with DOMPurify
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { broadcastMessageSchema } from "@/lib/validations/message";
import { messageRateLimiter } from "@/lib/rate-limit";
import { sanitizeHtml } from "@/lib/sanitize";

/**
 * POST /api/messages/broadcast
 *
 * Send a broadcast message to all active subscribers
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

    // Get user and verify they are a creator
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        creatorProfile: {
          select: {
            id: true,
            status: true,
            displayName: true,
          },
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
        {
          error: "Only creators can send broadcast messages",
          code: "NOT_CREATOR",
        },
        { status: 403 },
      );
    }

    if (user.creatorProfile.status !== "active") {
      return NextResponse.json(
        {
          error: "Your creator profile is not active",
          code: "CREATOR_NOT_ACTIVE",
        },
        { status: 403 },
      );
    }

    // Check rate limit (PRD: 30 messages/hour for creators)
    const rateLimitResult = await messageRateLimiter.checkAsync(user.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "You have reached the message limit. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "30",
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "Retry-After": String(rateLimitResult.retryAfterSeconds || 3600),
          },
        },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = broadcastMessageSchema.safeParse(body);

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

    const { content } = parseResult.data;

    // Sanitize content (PRD: DOMPurify for user-generated content)
    const sanitizedContent = sanitizeHtml(content);

    if (!sanitizedContent.trim()) {
      return NextResponse.json(
        {
          error: "Message content is required after sanitization",
          code: "EMPTY_CONTENT",
        },
        { status: 400 },
      );
    }

    // Get all active subscribers for this creator
    const subscribers = await prisma.subscription.findMany({
      where: {
        creatorId: user.creatorProfile.id,
        status: { in: ["active", "trialing"] },
      },
      select: {
        userId: true,
      },
    });

    if (subscribers.length === 0) {
      return NextResponse.json(
        {
          error: "You have no active subscribers to message",
          code: "NO_SUBSCRIBERS",
        },
        { status: 400 },
      );
    }

    // Create one message record per subscriber
    // Using createMany for efficiency
    const messageData = subscribers.map((sub) => ({
      senderId: user.id,
      receiverId: sub.userId,
      content: sanitizedContent,
      isBroadcast: true,
      isRead: false,
    }));

    const result = await prisma.message.createMany({
      data: messageData,
    });

    return NextResponse.json({
      success: true,
      message: "Broadcast sent successfully",
      recipientCount: result.count,
    });
  } catch (error) {
    console.error("Error sending broadcast:", error);
    return NextResponse.json(
      { error: "Failed to send broadcast message", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
