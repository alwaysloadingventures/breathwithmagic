import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Mail } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensure-user";
import { Button } from "@/components/ui/button";
import { MessagesInboxClient } from "./messages-inbox-client";

export const metadata: Metadata = {
  title: "Messages | breathwithmagic",
  description: "Messages from creators you subscribe to",
};

/**
 * MessagesPage - Server component for the subscriber message inbox
 *
 * PRD: /messages - Subscriber message inbox
 * - Shows received broadcasts and DM conversations
 * - Tabs for "Broadcasts" and "Conversations"
 * - Unread indicator
 */
export default async function MessagesPage() {
  // Ensure user exists in database (auto-creates if not)
  const userResult = await ensureUser();
  if (!userResult) {
    redirect("/sign-in?redirect_url=/messages");
  }
  const dbUser = userResult.user;

  const limit = 20;

  // Fetch initial broadcasts, conversations, and counts in parallel
  const [
    broadcasts,
    conversations,
    broadcastUnreadCount,
    dmUnreadCount,
    totalBroadcastCount,
  ] = await Promise.all([
    // Fetch broadcast messages
    prisma.message.findMany({
      where: {
        receiverId: dbUser.id,
        isBroadcast: true,
      },
      take: limit + 1,
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
    }),
    // Fetch DM conversations (get unique partners)
    fetchConversations(dbUser.id, limit),
    // Broadcast unread count
    prisma.message.count({
      where: {
        receiverId: dbUser.id,
        isBroadcast: true,
        isRead: false,
      },
    }),
    // DM unread count
    prisma.message.count({
      where: {
        receiverId: dbUser.id,
        isBroadcast: false,
        isRead: false,
      },
    }),
    // Total broadcast count for empty state
    prisma.message.count({
      where: {
        receiverId: dbUser.id,
        isBroadcast: true,
      },
    }),
  ]);

  const hasMoreBroadcasts = broadcasts.length > limit;
  const broadcastItems = hasMoreBroadcasts
    ? broadcasts.slice(0, limit)
    : broadcasts;

  // Format broadcasts for the client
  const formattedBroadcasts = broadcastItems.map((message) => ({
    id: message.id,
    content: message.content,
    isRead: message.isRead,
    isBroadcast: true,
    createdAt: message.createdAt.toISOString(),
    sender: {
      id: message.sender.id,
      name:
        message.sender.creatorProfile?.displayName ||
        message.sender.name ||
        "Unknown",
      avatarUrl:
        message.sender.creatorProfile?.avatarUrl || message.sender.avatarUrl,
      handle: message.sender.creatorProfile?.handle || null,
      isCreator: !!message.sender.creatorProfile,
    },
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">Messages</h1>
          {broadcastUnreadCount + dmUnreadCount > 0 && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-medium text-primary-foreground">
              {broadcastUnreadCount + dmUnreadCount > 99
                ? "99+"
                : broadcastUnreadCount + dmUnreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {totalBroadcastCount === 0 && conversations.length === 0 ? (
        <EmptyState />
      ) : (
        <MessagesInboxClient
          initialBroadcasts={formattedBroadcasts}
          initialHasMoreBroadcasts={hasMoreBroadcasts}
          initialBroadcastUnreadCount={broadcastUnreadCount}
          initialConversations={conversations}
          initialDmUnreadCount={dmUnreadCount}
        />
      )}
    </div>
  );
}

/**
 * Fetch DM conversations for a user
 * Groups messages by conversation partner and returns the most recent message per conversation
 */
async function fetchConversations(userId: string, limit: number) {
  // Get all DM messages involving this user
  const allDMMessages = await prisma.message.findMany({
    where: {
      isBroadcast: false,
      OR: [{ senderId: userId }, { receiverId: userId }],
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

  // Group by conversation partner
  const conversationsMap = new Map<
    string,
    {
      partnerId: string;
      partner: {
        id: string;
        name: string;
        avatarUrl: string | null;
        handle: string | null;
        isCreator: boolean;
      };
      lastMessage: {
        id: string;
        content: string;
        createdAt: string;
        isFromMe: boolean;
      };
      unreadCount: number;
    }
  >();

  for (const message of allDMMessages) {
    const isFromMe = message.senderId === userId;
    const partner = isFromMe ? message.receiver : message.sender;
    const partnerId = partner.id;

    if (conversationsMap.has(partnerId)) {
      // Count unread
      if (!isFromMe && !message.isRead) {
        const existing = conversationsMap.get(partnerId)!;
        existing.unreadCount += 1;
      }
      continue;
    }

    conversationsMap.set(partnerId, {
      partnerId,
      partner: {
        id: partner.id,
        name: partner.creatorProfile?.displayName || partner.name || "Unknown",
        avatarUrl: partner.creatorProfile?.avatarUrl || partner.avatarUrl,
        handle: partner.creatorProfile?.handle || null,
        isCreator: !!partner.creatorProfile,
      },
      lastMessage: {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        isFromMe,
      },
      unreadCount: !isFromMe && !message.isRead ? 1 : 0,
    });
  }

  // Convert to array and sort by last message time, limit results
  return Array.from(conversationsMap.values())
    .sort(
      (a, b) =>
        new Date(b.lastMessage.createdAt).getTime() -
        new Date(a.lastMessage.createdAt).getTime(),
    )
    .slice(0, limit);
}

/**
 * EmptyState - Shown when user has no messages
 */
function EmptyState() {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-muted">
        <Mail className="size-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <h2 className="mb-2 text-xl font-semibold text-foreground">
        No messages yet
      </h2>
      <p className="mx-auto mb-6 max-w-md text-muted-foreground">
        Messages from creators you subscribe to will appear here. Subscribe to
        your favorite creators to receive their updates and start conversations.
      </p>
      <Link href="/explore">
        <Button>Explore creators</Button>
      </Link>
    </div>
  );
}
