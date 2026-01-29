import { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { SkipLink } from "@/components/ui/skip-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CreatorConversationThreadClient } from "./conversation-thread-client";

interface PageProps {
  params: Promise<{ userId: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { userId } = await params;

  const partner = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  const partnerName = partner?.name || "Subscriber";

  return {
    title: `Chat with ${partnerName} | Creator Messages`,
    description: `Direct message conversation with ${partnerName}`,
  };
}

/**
 * CreatorConversationPage - Server component for a creator's 1:1 conversation thread
 *
 * PRD: Creator can reply to subscribers
 * - Messages in chronological order (oldest first)
 * - Compose reply at bottom
 * - Real-time feel (optimistic updates)
 */
export default async function CreatorConversationPage({ params }: PageProps) {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/sign-in?redirect_url=/creator/messages");
  }

  const { userId: partnerUserId } = await params;

  // Get the current user (creator) from our database
  const dbUser = await prisma.user.findUnique({
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

  if (!dbUser) {
    redirect("/sign-in");
  }

  if (!dbUser.creatorProfile) {
    redirect("/become-creator");
  }

  // Get the conversation partner (subscriber)
  const partner = await prisma.user.findUnique({
    where: { id: partnerUserId },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
    },
  });

  if (!partner) {
    notFound();
  }

  const limit = 50;

  // Fetch initial messages
  const messages = await prisma.message.findMany({
    where: {
      isBroadcast: false,
      OR: [
        { senderId: dbUser.id, receiverId: partnerUserId },
        { senderId: partnerUserId, receiverId: dbUser.id },
      ],
    },
    take: limit + 1,
    orderBy: { createdAt: "asc" },
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

  // Mark received messages as read
  const unreadMessageIds = messages
    .filter((m) => m.receiverId === dbUser.id && !m.isRead)
    .map((m) => m.id);

  if (unreadMessageIds.length > 0) {
    await prisma.message.updateMany({
      where: {
        id: { in: unreadMessageIds },
        receiverId: dbUser.id,
      },
      data: { isRead: true },
    });
  }

  const hasMore = messages.length > limit;
  const items = hasMore ? messages.slice(0, limit) : messages;

  // Creators can always reply to subscribers who have messaged them
  const canSendMessage = true;

  // Format messages for client
  const formattedMessages = items.map((message) => ({
    id: message.id,
    content: message.content,
    isRead: true, // Already marked as read
    createdAt: message.createdAt.toISOString(),
    isFromMe: message.senderId === dbUser.id,
    sender: {
      id: message.sender.id,
      name:
        message.sender.creatorProfile?.displayName ||
        message.sender.name ||
        "Unknown",
      avatarUrl:
        message.sender.creatorProfile?.avatarUrl || message.sender.avatarUrl,
      handle: message.sender.creatorProfile?.handle || null,
    },
  }));

  const partnerInfo = {
    id: partner.id,
    name: partner.name || "Unknown",
    avatarUrl: partner.avatarUrl,
    handle: null,
    isCreator: false,
  };

  const partnerInitials = partnerInfo.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <SkipLink />
      <div className="flex h-screen flex-col bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center gap-4">
              <Link
                href="/creator/messages"
                className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Back to messages"
              >
                <ArrowLeft className="size-5" aria-hidden="true" />
              </Link>

              <div className="flex items-center gap-3">
                <Avatar className="size-10 border-2 border-border">
                  {partnerInfo.avatarUrl ? (
                    <AvatarImage
                      src={partnerInfo.avatarUrl}
                      alt={partnerInfo.name}
                    />
                  ) : null}
                  <AvatarFallback>{partnerInitials}</AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="font-semibold text-foreground">
                    {partnerInfo.name}
                  </h1>
                  <Badge variant="outline" className="text-xs">
                    Subscriber
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main
          id="main-content"
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden px-4 sm:px-6 lg:px-8">
            <CreatorConversationThreadClient
              initialMessages={formattedMessages}
              initialHasMore={hasMore}
              partner={partnerInfo}
              canSendMessage={canSendMessage}
            />
          </div>
        </main>
      </div>
    </>
  );
}
