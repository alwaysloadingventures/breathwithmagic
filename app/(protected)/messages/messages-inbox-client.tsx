"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Mail,
  MailOpen,
  CheckCheck,
  MessageCircle,
  Radio,
} from "lucide-react";
import { formatMessageTime, truncateMessage } from "@/lib/validations/message";
import { cn } from "@/lib/utils";
import { stripHtml } from "@/lib/sanitize";

interface MessageItem {
  id: string;
  content: string;
  isRead: boolean;
  isBroadcast: boolean;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    avatarUrl: string | null;
    handle: string | null;
    isCreator: boolean;
  };
}

interface ConversationItem {
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

interface MessagesInboxClientProps {
  initialBroadcasts: MessageItem[];
  initialHasMoreBroadcasts: boolean;
  initialBroadcastUnreadCount: number;
  initialConversations: ConversationItem[];
  initialDmUnreadCount: number;
}

/**
 * Messages Inbox Client Component
 *
 * Client component for the subscriber message inbox with:
 * - Tabs for Broadcasts and Conversations
 * - Message list with unread indicators
 * - Mark as read functionality
 * - Pagination
 */
export function MessagesInboxClient({
  initialBroadcasts,
  initialHasMoreBroadcasts,
  initialBroadcastUnreadCount,
  initialConversations,
  initialDmUnreadCount,
}: MessagesInboxClientProps) {
  const [broadcasts, setBroadcasts] =
    useState<MessageItem[]>(initialBroadcasts);
  const [hasMoreBroadcasts, setHasMoreBroadcasts] = useState(
    initialHasMoreBroadcasts,
  );
  const [broadcastCursor, setBroadcastCursor] = useState<string | null>(
    initialBroadcasts.length > 0
      ? initialBroadcasts[initialBroadcasts.length - 1].id
      : null,
  );
  const [broadcastUnreadCount, setBroadcastUnreadCount] = useState(
    initialBroadcastUnreadCount,
  );
  const [conversations] = useState<ConversationItem[]>(initialConversations);
  const [dmUnreadCount] = useState(initialDmUnreadCount);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Mark a broadcast message as read
   */
  const markAsRead = useCallback(async (messageId: string) => {
    // Optimistic update
    setBroadcasts((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, isRead: true } : msg,
      ),
    );
    setBroadcastUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const response = await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds: [messageId] }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark as read");
      }
    } catch (err) {
      // Revert on error
      console.error("Error marking message as read:", err);
      setBroadcasts((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, isRead: false } : msg,
        ),
      );
      setBroadcastUnreadCount((prev) => prev + 1);
    }
  }, []);

  /**
   * Mark all broadcasts as read
   */
  const markAllAsRead = useCallback(async () => {
    const unreadIds = broadcasts
      .filter((msg) => !msg.isRead)
      .map((msg) => msg.id);
    if (unreadIds.length === 0) return;

    // Optimistic update
    setBroadcasts((prev) => prev.map((msg) => ({ ...msg, isRead: true })));
    setBroadcastUnreadCount(0);

    try {
      const response = await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds: unreadIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark all as read");
      }
    } catch (err) {
      console.error("Error marking all as read:", err);
      // Revert on error
      setBroadcasts(initialBroadcasts);
      setBroadcastUnreadCount(initialBroadcastUnreadCount);
    }
  }, [broadcasts, initialBroadcasts, initialBroadcastUnreadCount]);

  /**
   * Fetch more broadcast messages
   */
  const fetchMoreBroadcasts = useCallback(async () => {
    if (isLoading || !hasMoreBroadcasts) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (broadcastCursor) params.set("cursor", broadcastCursor);

      const response = await fetch(`/api/messages?${params}`);
      if (!response.ok) throw new Error("Failed to fetch messages");

      const data = await response.json();

      // Filter to only broadcasts
      const broadcastItems = data.items.filter(
        (item: MessageItem) => item.isBroadcast,
      );

      setBroadcasts((prev) => [...prev, ...broadcastItems]);
      setHasMoreBroadcasts(!!data.nextCursor);
      setBroadcastCursor(data.nextCursor);
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError("Failed to load messages. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [broadcastCursor, hasMoreBroadcasts, isLoading]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="broadcasts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="broadcasts" className="relative min-h-[44px]">
            <Radio className="mr-2 size-4" aria-hidden="true" />
            Broadcasts
            {broadcastUnreadCount > 0 && (
              <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                {broadcastUnreadCount > 99 ? "99+" : broadcastUnreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="conversations" className="relative min-h-[44px]">
            <MessageCircle className="mr-2 size-4" aria-hidden="true" />
            Conversations
            {dmUnreadCount > 0 && (
              <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                {dmUnreadCount > 99 ? "99+" : dmUnreadCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Broadcasts Tab */}
        <TabsContent value="broadcasts" className="mt-6">
          {/* Mark all as read */}
          {broadcastUnreadCount > 0 && (
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {broadcastUnreadCount} unread{" "}
                {broadcastUnreadCount === 1 ? "message" : "messages"}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="min-h-[44px]"
              >
                <CheckCheck className="mr-2 size-4" />
                Mark all as read
              </Button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 rounded-lg border border-destructive bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {broadcasts.length === 0 ? (
            <div className="py-12 text-center">
              <Radio
                className="mx-auto mb-4 size-12 text-muted-foreground/50"
                aria-hidden="true"
              />
              <p className="text-muted-foreground">No broadcast messages yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Broadcasts from creators you subscribe to will appear here.
              </p>
            </div>
          ) : (
            <>
              {/* Broadcasts List */}
              <div className="space-y-3">
                {broadcasts.map((message) => (
                  <BroadcastCard
                    key={message.id}
                    message={message}
                    onMarkAsRead={markAsRead}
                  />
                ))}

                {/* Loading Skeletons */}
                {isLoading &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <MessageCardSkeleton key={i} />
                  ))}
              </div>

              {/* Load More */}
              {hasMoreBroadcasts && !isLoading && (
                <div className="mt-4 flex justify-center">
                  <Button variant="outline" onClick={fetchMoreBroadcasts}>
                    Load more messages
                  </Button>
                </div>
              )}

              {/* Loading More Indicator */}
              {isLoading && broadcasts.length > 0 && (
                <div className="mt-4 flex justify-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Conversations Tab */}
        <TabsContent value="conversations" className="mt-6">
          {conversations.length === 0 ? (
            <div className="py-12 text-center">
              <MessageCircle
                className="mx-auto mb-4 size-12 text-muted-foreground/50"
                aria-hidden="true"
              />
              <p className="text-muted-foreground">No conversations yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Start a conversation by messaging a creator from their profile.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((conversation) => (
                <ConversationCard
                  key={conversation.partnerId}
                  conversation={conversation}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Broadcast Card Component
 */
function BroadcastCard({
  message,
  onMarkAsRead,
}: {
  message: MessageItem;
  onMarkAsRead: (id: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = message.content.length > 250;
  const displayContent = isExpanded
    ? message.content
    : truncateMessage(message.content, 250);

  const initials = message.sender.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Mark as read when clicking on unread message
  const handleClick = () => {
    if (!message.isRead) {
      onMarkAsRead(message.id);
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors cursor-pointer",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        message.isRead
          ? "border-border bg-card"
          : "border-primary/30 bg-primary/5",
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleClick();
        }
      }}
    >
      <div className="flex gap-4">
        {/* Avatar */}
        {message.sender.handle ? (
          <Link
            href={`/${message.sender.handle}`}
            className="shrink-0"
            aria-label={`View ${message.sender.name}'s profile`}
            onClick={(e) => e.stopPropagation()}
          >
            <Avatar className="size-12 border-2 border-border transition-all hover:ring-2 hover:ring-primary/20">
              {message.sender.avatarUrl ? (
                <AvatarImage
                  src={message.sender.avatarUrl}
                  alt={message.sender.name}
                />
              ) : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Link>
        ) : (
          <Avatar className="size-12 border-2 border-border">
            {message.sender.avatarUrl ? (
              <AvatarImage
                src={message.sender.avatarUrl}
                alt={message.sender.name}
              />
            ) : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        )}

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {message.sender.handle ? (
                <Link
                  href={`/${message.sender.handle}`}
                  className="font-semibold text-foreground transition-colors hover:text-primary"
                  onClick={(e) => e.stopPropagation()}
                >
                  {message.sender.name}
                </Link>
              ) : (
                <span className="font-semibold text-foreground">
                  {message.sender.name}
                </span>
              )}
              <Badge variant="secondary" className="text-xs">
                Broadcast
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {!message.isRead && (
                <span className="size-2 rounded-full bg-primary" />
              )}
              {message.isRead ? (
                <MailOpen className="size-4 text-muted-foreground" />
              ) : (
                <Mail className="size-4 text-primary" />
              )}
            </div>
          </div>

          {/* Message Content - rendered as HTML since it's sanitized with DOMPurify on storage */}
          <div
            className="mt-2 max-w-none text-sm text-foreground [&_a]:text-primary [&_a]:underline [&_a:hover]:text-primary/80 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-4 [&_blockquote]:italic"
            dangerouslySetInnerHTML={{ __html: displayContent }}
          />

          {isLong && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="mt-2 min-h-[44px] text-sm font-medium text-primary hover:underline"
            >
              {isExpanded ? "Show less" : "Show more"}
            </button>
          )}

          {/* Timestamp */}
          <p className="mt-2 text-sm text-muted-foreground">
            {formatMessageTime(new Date(message.createdAt))}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Conversation Card Component
 */
function ConversationCard({
  conversation,
}: {
  conversation: ConversationItem;
}) {
  const initials = conversation.partner.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Strip HTML from preview
  const previewText = stripHtml(conversation.lastMessage.content);
  const truncatedPreview = truncateMessage(previewText, 80);

  return (
    <Link
      href={`/messages/conversation/${conversation.partner.id}`}
      className={cn(
        "flex gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50",
        conversation.unreadCount > 0
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card",
      )}
    >
      {/* Avatar */}
      <Avatar className="size-12 shrink-0 border-2 border-border">
        {conversation.partner.avatarUrl ? (
          <AvatarImage
            src={conversation.partner.avatarUrl}
            alt={conversation.partner.name}
          />
        ) : null}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-foreground">
              {conversation.partner.name}
            </p>
            {conversation.partner.handle && (
              <p className="text-sm text-muted-foreground">
                @{conversation.partner.handle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {conversation.unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                {conversation.unreadCount > 99
                  ? "99+"
                  : conversation.unreadCount}
              </span>
            )}
          </div>
        </div>

        {/* Last Message Preview */}
        <p className="mt-1 text-sm text-muted-foreground">
          {conversation.lastMessage.isFromMe && (
            <span className="text-foreground/70">You: </span>
          )}
          {truncatedPreview}
        </p>

        {/* Timestamp */}
        <p className="mt-1 text-xs text-muted-foreground">
          {formatMessageTime(new Date(conversation.lastMessage.createdAt))}
        </p>
      </div>
    </Link>
  );
}

/**
 * Message Card Skeleton
 */
function MessageCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex gap-4">
        <div className="size-12 animate-pulse rounded-full bg-muted" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
