/**
 * /api/messages/conversation/[userId]
 *
 * GET - Get messages between current user and specified user
 *
 * PRD Requirements:
 * - Get message history with specific user
 * - Paginated messages between current user and specified user
 * - Marks messages as read automatically
 * - Shows messages in chronological order (oldest first in thread)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { conversationMessagesQuerySchema } from "@/lib/validations/message";

interface RouteContext {
  params: Promise<{ userId: string }>;
}

/**
 * GET /api/messages/conversation/[userId]
 *
 * Fetch messages between current user and the specified user
 * Returns messages in chronological order (oldest first)
 * Automatically marks received messages as read
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // Verify authentication
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // Get the partner user ID from params
    const { userId: partnerUserId } = await context.params;

    if (!partnerUserId) {
      return NextResponse.json(
        { error: "User ID is required", code: "MISSING_USER_ID" },
        { status: 400 },
      );
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        creatorProfile: {
          select: {
            id: true,
            dmEnabled: true,
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

    // Prevent viewing conversation with self
    if (partnerUserId === user.id) {
      return NextResponse.json(
        { error: "Invalid conversation partner", code: "INVALID_PARTNER" },
        { status: 400 },
      );
    }

    // Get the partner user
    const partner = await prisma.user.findUnique({
      where: { id: partnerUserId },
      include: {
        creatorProfile: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatarUrl: true,
            dmEnabled: true,
          },
        },
      },
    });

    if (!partner) {
      return NextResponse.json(
        { error: "Conversation partner not found", code: "PARTNER_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryResult = conversationMessagesQuerySchema.safeParse({
      cursor: searchParams.get("cursor") || undefined,
      limit: searchParams.get("limit") || 50,
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

    const { cursor, limit } = queryResult.data;

    // Fetch messages between these two users (non-broadcast only)
    // Order by createdAt ascending (oldest first) for conversation view
    const messages = await prisma.message.findMany({
      where: {
        isBroadcast: false,
        OR: [
          { senderId: user.id, receiverId: partnerUserId },
          { senderId: partnerUserId, receiverId: user.id },
        ],
      },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: "asc" }, // Oldest first for thread view
      include: {
        sender: {
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

    // Mark received messages as read (optimistically)
    const unreadMessageIds = messages
      .filter((m) => m.receiverId === user.id && !m.isRead)
      .map((m) => m.id);

    if (unreadMessageIds.length > 0) {
      // Fire and forget - don't wait for this to complete
      prisma.message
        .updateMany({
          where: {
            id: { in: unreadMessageIds },
            receiverId: user.id,
          },
          data: { isRead: true },
        })
        .catch((err) => {
          console.error("Error marking messages as read:", err);
        });
    }

    // Determine pagination
    const hasNextPage = messages.length > limit;
    const items = hasNextPage ? messages.slice(0, limit) : messages;
    const nextCursor = hasNextPage ? items[items.length - 1]?.id : null;

    // Determine if current user can send messages to this partner
    let canSendMessage = false;
    let dmDisabledReason: string | null = null;

    const userIsCreator = !!user.creatorProfile?.id;
    const partnerIsCreator = !!partner.creatorProfile?.id;

    if (userIsCreator && !partnerIsCreator) {
      // Creator viewing conversation with subscriber - can always reply
      canSendMessage = true;
    } else if (!userIsCreator && partnerIsCreator) {
      // Subscriber viewing conversation with creator
      if (!partner.creatorProfile!.dmEnabled) {
        canSendMessage = false;
        dmDisabledReason = "This creator has disabled direct messages";
      } else {
        // Check if user has active subscription
        const subscription = await prisma.subscription.findFirst({
          where: {
            userId: user.id,
            creatorId: partner.creatorProfile!.id,
            status: { in: ["active", "trialing"] },
          },
        });
        if (subscription) {
          canSendMessage = true;
        } else {
          canSendMessage = false;
          dmDisabledReason = "Subscribe to send messages";
        }
      }
    }

    return NextResponse.json({
      items: items.map((message) => ({
        id: message.id,
        content: message.content,
        isRead: message.isRead || unreadMessageIds.includes(message.id),
        createdAt: message.createdAt.toISOString(),
        isFromMe: message.senderId === user.id,
        sender: {
          id: message.sender.id,
          name:
            message.sender.creatorProfile?.displayName || message.sender.name,
          avatarUrl:
            message.sender.creatorProfile?.avatarUrl ||
            message.sender.avatarUrl,
          handle: message.sender.creatorProfile?.handle || null,
        },
      })),
      nextCursor,
      partner: {
        id: partner.id,
        name: partner.creatorProfile?.displayName || partner.name || "Unknown",
        avatarUrl: partner.creatorProfile?.avatarUrl || partner.avatarUrl,
        handle: partner.creatorProfile?.handle || null,
        isCreator: partnerIsCreator,
      },
      canSendMessage,
      dmDisabledReason,
    });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
