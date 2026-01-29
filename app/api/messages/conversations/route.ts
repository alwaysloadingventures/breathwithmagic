/**
 * /api/messages/conversations
 *
 * GET - List all DM conversations for the current user
 *
 * PRD Requirements:
 * - Conversation inbox UI showing threads
 * - For subscribers: shows creators they've messaged
 * - For creators: shows subscribers who've messaged them
 * - Returns unique conversation partners with last message preview
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { conversationListQuerySchema } from "@/lib/validations/message";

interface ConversationPartner {
  id: string;
  name: string;
  avatarUrl: string | null;
  handle: string | null;
  isCreator: boolean;
}

interface ConversationItem {
  partner: ConversationPartner;
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    isFromMe: boolean;
  };
  unreadCount: number;
}

/**
 * GET /api/messages/conversations
 *
 * Fetch all DM conversations for the current user
 * Returns unique conversation partners with last message preview
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
      include: {
        creatorProfile: {
          select: { id: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryResult = conversationListQuerySchema.safeParse({
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

    const { cursor, limit } = queryResult.data;

    // Get all DM messages (non-broadcast) involving this user
    // We need to find unique conversation partners
    const allDMMessages = await prisma.message.findMany({
      where: {
        isBroadcast: false,
        OR: [{ senderId: user.id }, { receiverId: user.id }],
      },
      orderBy: { createdAt: "desc" },
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

    // Group messages by conversation partner
    const conversationsMap = new Map<
      string,
      {
        partnerId: string;
        partner: ConversationPartner;
        lastMessage: {
          id: string;
          content: string;
          createdAt: Date;
          isFromMe: boolean;
        };
        unreadCount: number;
      }
    >();

    for (const message of allDMMessages) {
      // Determine the conversation partner (the other user)
      const isFromMe = message.senderId === user.id;
      const partner = isFromMe ? message.receiver : message.sender;
      const partnerId = partner.id;

      // Skip if we already have a more recent message for this conversation
      if (conversationsMap.has(partnerId)) {
        // Just count unread if message is to me and unread
        if (!isFromMe && !message.isRead) {
          const existing = conversationsMap.get(partnerId)!;
          existing.unreadCount += 1;
        }
        continue;
      }

      // This is the most recent message in this conversation
      conversationsMap.set(partnerId, {
        partnerId,
        partner: {
          id: partner.id,
          name:
            partner.creatorProfile?.displayName || partner.name || "Unknown",
          avatarUrl: partner.creatorProfile?.avatarUrl || partner.avatarUrl,
          handle: partner.creatorProfile?.handle || null,
          isCreator: !!partner.creatorProfile,
        },
        lastMessage: {
          id: message.id,
          content: message.content,
          createdAt: message.createdAt,
          isFromMe,
        },
        unreadCount: !isFromMe && !message.isRead ? 1 : 0,
      });
    }

    // Convert to array and sort by last message time (descending)
    const sortedConversations = Array.from(conversationsMap.values()).sort(
      (a, b) =>
        b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime(),
    );

    // Apply cursor filtering if cursor provided
    let filteredConversations = sortedConversations;
    if (cursor) {
      const cursorIndex = sortedConversations.findIndex(
        (c) => c.partnerId === cursor,
      );
      if (cursorIndex !== -1) {
        filteredConversations = sortedConversations.slice(cursorIndex + 1);
      }
    }

    // Apply limit and determine pagination info
    const hasMore = filteredConversations.length > limit;
    const paginatedConversations = filteredConversations.slice(0, limit);
    const nextCursor = hasMore
      ? paginatedConversations[paginatedConversations.length - 1]?.partnerId
      : null;

    // Map to final response format
    const conversations: ConversationItem[] = paginatedConversations.map(
      (conv) => ({
        partner: conv.partner,
        lastMessage: {
          id: conv.lastMessage.id,
          content: conv.lastMessage.content,
          createdAt: conv.lastMessage.createdAt.toISOString(),
          isFromMe: conv.lastMessage.isFromMe,
        },
        unreadCount: conv.unreadCount,
      }),
    );

    // Get total unread DM count
    const totalUnreadCount = await prisma.message.count({
      where: {
        receiverId: user.id,
        isBroadcast: false,
        isRead: false,
      },
    });

    return NextResponse.json({
      items: conversations,
      nextCursor,
      totalCount: sortedConversations.length,
      totalUnreadCount,
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
