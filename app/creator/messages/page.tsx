import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MessagesClient } from "./messages-client";

/**
 * Creator Messages Page
 *
 * Server component that fetches initial broadcast messages and conversations
 * and renders the client component for interactivity.
 *
 * PRD: /creator/messages - Creator message center
 * - Shows sent broadcasts with timestamp
 * - Shows DM conversations with subscribers
 * - "New Broadcast" button opens compose modal
 */
export default async function CreatorMessagesPage() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/sign-in");
  }

  // Fetch creator profile and verify
  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      creatorProfile: {
        select: {
          id: true,
          status: true,
          displayName: true,
          dmEnabled: true,
        },
      },
    },
  });

  if (!user?.creatorProfile) {
    redirect("/become-creator");
  }

  const limit = 20;

  // Fetch initial broadcast messages, conversations, and subscriber count in parallel
  const [messages, conversations, subscriberCount, dmUnreadCount] =
    await Promise.all([
      prisma.message.findMany({
        where: {
          senderId: user.id,
          isBroadcast: true,
        },
        take: limit + 1,
        orderBy: { createdAt: "desc" },
        distinct: ["content"],
      }),
      // Fetch DM conversations
      fetchCreatorConversations(user.id, limit),
      prisma.subscription.count({
        where: {
          creatorId: user.creatorProfile.id,
          status: { in: ["active", "trialing"] },
        },
      }),
      // DM unread count
      prisma.message.count({
        where: {
          receiverId: user.id,
          isBroadcast: false,
          isRead: false,
        },
      }),
    ]);

  // For each unique broadcast, get the recipient count
  const broadcastsWithCounts = await Promise.all(
    messages.slice(0, limit).map(async (message) => {
      const recipientCount = await prisma.message.count({
        where: {
          senderId: user.id,
          isBroadcast: true,
          content: message.content,
          createdAt: {
            gte: new Date(message.createdAt.getTime() - 10000),
            lte: new Date(message.createdAt.getTime() + 10000),
          },
        },
      });

      return {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        recipientCount,
      };
    }),
  );

  // De-duplicate broadcasts by content + timestamp (minute precision)
  const uniqueBroadcasts = new Map<string, (typeof broadcastsWithCounts)[0]>();
  for (const broadcast of broadcastsWithCounts) {
    const timestamp = new Date(broadcast.createdAt);
    const key = `${broadcast.content}-${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}-${timestamp.getHours()}-${timestamp.getMinutes()}`;
    if (!uniqueBroadcasts.has(key)) {
      uniqueBroadcasts.set(key, broadcast);
    }
  }

  const initialBroadcasts = Array.from(uniqueBroadcasts.values());
  const hasMore = messages.length > limit;

  return (
    <MessagesClient
      initialBroadcasts={initialBroadcasts}
      initialHasMore={hasMore}
      subscriberCount={subscriberCount}
      creatorStatus={user.creatorProfile.status}
      dmEnabled={user.creatorProfile.dmEnabled}
      initialConversations={conversations}
      initialDmUnreadCount={dmUnreadCount}
    />
  );
}

/**
 * Fetch DM conversations for a creator
 * Groups messages by conversation partner (subscribers) and returns the most recent message per conversation
 */
async function fetchCreatorConversations(userId: string, limit: number) {
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
