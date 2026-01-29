/**
 * /api/messages
 *
 * GET - Fetch messages for the current user (subscriber inbox)
 * POST - Send a direct message (1:1 DM)
 * PATCH - Mark messages as read
 *
 * PRD Requirements:
 * - Subscriber message inbox showing received messages from creators
 * - Direct messaging: subscriber can message creator (if DMs enabled)
 * - Creator can reply to subscribers
 * - Unread indicator
 * - Cursor-based pagination
 * - Rate limit: 30 messages/hour
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  messageListQuerySchema,
  markReadSchema,
  directMessageSchema,
} from "@/lib/validations/message";
import { messageRateLimiter } from "@/lib/rate-limit";
import { sanitizeHtml } from "@/lib/sanitize";
import { sendNewMessageEmail } from "@/lib/email";
import { notifyNewMessage } from "@/lib/notifications";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/messages
 *
 * Fetch received messages for the current user with pagination
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

    // Get user
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
    const queryResult = messageListQuerySchema.safeParse({
      cursor: searchParams.get("cursor") || undefined,
      limit: searchParams.get("limit") || 20,
      unreadOnly: searchParams.get("unreadOnly") === "true",
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

    const { cursor, limit, unreadOnly } = queryResult.data;

    // Build where clause
    const where: Prisma.MessageWhereInput = {
      receiverId: user.id,
    };

    if (unreadOnly) {
      where.isRead = false;
    }

    // Fetch messages with sender info
    const messages = await prisma.message.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            creatorProfile: {
              select: {
                id: true,
                handle: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    // Get unread count for badge
    const unreadCount = await prisma.message.count({
      where: {
        receiverId: user.id,
        isRead: false,
      },
    });

    // Determine pagination
    const hasNextPage = messages.length > limit;
    const items = hasNextPage ? messages.slice(0, limit) : messages;
    const nextCursor = hasNextPage ? items[items.length - 1]?.id : null;

    return NextResponse.json({
      items: items.map((message) => ({
        id: message.id,
        content: message.content,
        isRead: message.isRead,
        isBroadcast: message.isBroadcast,
        createdAt: message.createdAt.toISOString(),
        sender: {
          id: message.sender.id,
          name:
            message.sender.creatorProfile?.displayName || message.sender.name,
          avatarUrl:
            message.sender.creatorProfile?.avatarUrl ||
            message.sender.avatarUrl,
          handle: message.sender.creatorProfile?.handle || null,
          isCreator: !!message.sender.creatorProfile,
        },
      })),
      nextCursor,
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/messages
 *
 * Send a direct message (1:1 DM) to another user
 * PRD Requirements:
 * - Subscriber can message creator (if creator has DMs enabled)
 * - Creator can reply to subscribers who have messaged them
 * - Rate limit: 30 messages/hour
 * - Content sanitization
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

    // Get sender user with their creator profile (if any)
    const sender = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        creatorProfile: {
          select: {
            id: true,
            status: true,
            dmEnabled: true,
            displayName: true,
          },
        },
      },
    });

    if (!sender) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Check rate limit (PRD: 30 messages/hour)
    const rateLimitResult = await messageRateLimiter.checkAsync(sender.id);
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
    const parseResult = directMessageSchema.safeParse(body);

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

    const { receiverId, content } = parseResult.data;

    // Prevent self-messaging
    if (receiverId === sender.id) {
      return NextResponse.json(
        {
          error: "You cannot send a message to yourself",
          code: "SELF_MESSAGE",
        },
        { status: 400 },
      );
    }

    // Get the receiver user with their creator profile
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      include: {
        creatorProfile: {
          select: {
            id: true,
            status: true,
            dmEnabled: true,
          },
        },
      },
    });

    if (!receiver) {
      return NextResponse.json(
        { error: "Recipient not found", code: "RECIPIENT_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Determine if this is:
    // 1. Subscriber messaging a creator (need active subscription + DMs enabled)
    // 2. Creator replying to a subscriber (need existing conversation)

    const senderIsCreator = !!sender.creatorProfile?.id;
    const receiverIsCreator = !!receiver.creatorProfile?.id;

    if (senderIsCreator && !receiverIsCreator) {
      // Creator is messaging a subscriber - check if subscriber has messaged them FIRST
      // PRD: "Creator cannot initiate DM to subscriber who hasn't messaged first"
      // Creators can ONLY reply - cannot initiate conversations
      const subscriberInitiatedConversation = await prisma.message.findFirst({
        where: {
          senderId: receiver.id, // Subscriber sent TO creator
          receiverId: sender.id,
          isBroadcast: false,
        },
      });

      // Creators can ONLY reply - cannot initiate
      if (!subscriberInitiatedConversation) {
        return NextResponse.json(
          {
            error:
              "You can only reply to subscribers who have messaged you first.",
            code: "CAN_ONLY_REPLY",
          },
          { status: 403 },
        );
      }
      // No need to check subscription - they messaged us, so they were subscribed at some point
    } else if (!senderIsCreator && receiverIsCreator) {
      // Subscriber messaging a creator
      // Check if creator has DMs enabled
      if (!receiver.creatorProfile!.dmEnabled) {
        return NextResponse.json(
          {
            error: "This creator has direct messages disabled",
            code: "DMS_DISABLED",
          },
          { status: 403 },
        );
      }

      // Check if sender has an active subscription to this creator
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId: sender.id,
          creatorId: receiver.creatorProfile!.id,
          status: { in: ["active", "trialing"] },
        },
      });

      if (!subscription) {
        return NextResponse.json(
          {
            error: "You must be subscribed to this creator to send messages",
            code: "NOT_SUBSCRIBED",
          },
          { status: 403 },
        );
      }
    } else if (!senderIsCreator && !receiverIsCreator) {
      // User-to-user messaging (not allowed in current PRD)
      return NextResponse.json(
        {
          error:
            "Direct messages are only available between creators and subscribers",
          code: "INVALID_RECIPIENT",
        },
        { status: 403 },
      );
    } else {
      // Creator-to-creator (not supported in current PRD)
      return NextResponse.json(
        {
          error: "Creator-to-creator messaging is not supported",
          code: "INVALID_RECIPIENT",
        },
        { status: 403 },
      );
    }

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

    // Create the message
    const message = await prisma.message.create({
      data: {
        senderId: sender.id,
        receiverId: receiver.id,
        content: sanitizedContent,
        isBroadcast: false,
        isRead: false,
      },
      include: {
        receiver: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            creatorProfile: {
              select: {
                handle: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    // Get sender name for notifications
    const senderName =
      sender.creatorProfile?.displayName || sender.name || "Someone";

    // Send in-app notification (fire and forget)
    notifyNewMessage(
      receiver.id,
      senderName,
      sanitizedContent,
      "/messages",
    ).catch((error) =>
      console.error("Error sending new message notification:", error),
    );

    // Send email notification (fire and forget)
    sendNewMessageEmail(receiver.id, senderName, sanitizedContent).catch(
      (error) => console.error("Error sending new message email:", error),
    );

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        receiver: {
          id: message.receiver.id,
          name:
            message.receiver.creatorProfile?.displayName ||
            message.receiver.name,
          avatarUrl:
            message.receiver.creatorProfile?.avatarUrl ||
            message.receiver.avatarUrl,
          handle: message.receiver.creatorProfile?.handle || null,
        },
      },
    });
  } catch (error) {
    console.error("Error sending direct message:", error);
    return NextResponse.json(
      { error: "Failed to send message", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/messages
 *
 * Mark messages as read
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // Get user
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
    const parseResult = markReadSchema.safeParse(body);

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

    const { messageIds } = parseResult.data;

    // Update messages (only those belonging to this user)
    const result = await prisma.message.updateMany({
      where: {
        id: { in: messageIds },
        receiverId: user.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return NextResponse.json(
      { error: "Failed to update messages", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
