"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  MessageSquarePlus,
  Send,
  Users,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  Radio,
} from "lucide-react";
import {
  MAX_MESSAGE_LENGTH,
  getMessageCharacterInfo,
  formatMessageTime,
  truncateMessage,
} from "@/lib/validations/message";
import { stripHtml } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import type { CreatorStatus } from "@prisma/client";

interface BroadcastItem {
  id: string;
  content: string;
  createdAt: string;
  recipientCount: number;
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

interface MessagesClientProps {
  initialBroadcasts: BroadcastItem[];
  initialHasMore: boolean;
  subscriberCount: number;
  creatorStatus: CreatorStatus;
  dmEnabled: boolean;
  initialConversations: ConversationItem[];
  initialDmUnreadCount: number;
}

/**
 * Creator Messages Client Component
 *
 * Client component for the creator message center with:
 * - Tabs for Broadcasts and Conversations
 * - Sent broadcasts list with timestamps
 * - DM conversations with subscribers
 * - New Broadcast modal with compose form
 * - Character limit display
 */
export function MessagesClient({
  initialBroadcasts,
  initialHasMore,
  subscriberCount,
  creatorStatus,
  dmEnabled,
  initialConversations,
  initialDmUnreadCount,
}: MessagesClientProps) {
  const [broadcasts, setBroadcasts] =
    useState<BroadcastItem[]>(initialBroadcasts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [cursor, setCursor] = useState<string | null>(
    initialBroadcasts.length > 0
      ? initialBroadcasts[initialBroadcasts.length - 1].id
      : null,
  );
  const [conversations] = useState<ConversationItem[]>(initialConversations);
  const [dmUnreadCount] = useState(initialDmUnreadCount);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compose modal state
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  const charInfo = getMessageCharacterInfo(messageContent);
  const canSend =
    messageContent.trim().length > 0 &&
    !charInfo.isOverLimit &&
    subscriberCount > 0 &&
    creatorStatus === "active";

  /**
   * Fetch more broadcasts
   */
  const fetchMoreBroadcasts = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);

      const response = await fetch(`/api/creator/messages?${params}`);
      if (!response.ok) throw new Error("Failed to fetch messages");

      const data = await response.json();

      setBroadcasts((prev) => [...prev, ...data.items]);
      setHasMore(!!data.nextCursor);
      setCursor(data.nextCursor);
    } catch (err) {
      console.error("Error fetching broadcasts:", err);
      setError("Failed to load messages. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [cursor, hasMore, isLoading]);

  /**
   * Send broadcast message
   */
  const handleSendBroadcast = async () => {
    if (!canSend || isSending) return;

    setIsSending(true);
    setSendError(null);
    setSendSuccess(false);

    try {
      const response = await fetch("/api/messages/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageContent }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send broadcast");
      }

      // Success - add to list and reset form
      setSendSuccess(true);
      setBroadcasts((prev) => [
        {
          id: `temp-${Date.now()}`,
          content: messageContent,
          createdAt: new Date().toISOString(),
          recipientCount: data.recipientCount,
        },
        ...prev,
      ]);

      // Reset form after short delay to show success state
      setTimeout(() => {
        setMessageContent("");
        setSendSuccess(false);
        setIsComposeOpen(false);
      }, 1500);
    } catch (err) {
      console.error("Error sending broadcast:", err);
      setSendError(
        err instanceof Error ? err.message : "Failed to send broadcast",
      );
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Reset compose state when modal opens
   */
  useEffect(() => {
    if (isComposeOpen) {
      setMessageContent("");
      setSendError(null);
      setSendSuccess(false);
    }
  }, [isComposeOpen]);

  const isCreatorActive = creatorStatus === "active";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Messages</h1>
          <p className="mt-1 text-muted-foreground">
            Communicate with your subscribers through broadcasts and direct
            messages.
          </p>
        </div>

        {/* New Broadcast Button */}
        <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
          <DialogTrigger
            render={
              <Button
                disabled={!isCreatorActive || subscriberCount === 0}
                className="min-h-[44px]"
              />
            }
          >
            <MessageSquarePlus className="mr-2 size-4" aria-hidden="true" />
            New Broadcast
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Send Broadcast Message</DialogTitle>
              <DialogDescription>
                This message will be sent to all {subscriberCount} of your
                active subscribers.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Message Input */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Write your message to subscribers..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  rows={6}
                  disabled={isSending || sendSuccess}
                  className="resize-none"
                  aria-label="Broadcast message content"
                />

                {/* Character Count */}
                <div className="flex items-center justify-between text-sm">
                  <span
                    className={
                      charInfo.isOverLimit
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }
                  >
                    {charInfo.count.toLocaleString()} /{" "}
                    {MAX_MESSAGE_LENGTH.toLocaleString()} characters
                  </span>
                  {charInfo.isOverLimit && (
                    <span className="text-destructive">
                      {charInfo.remaining.toLocaleString()} over limit
                    </span>
                  )}
                </div>
              </div>

              {/* Send Error */}
              {sendError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive bg-destructive/10 p-3">
                  <AlertCircle className="mt-0.5 size-4 text-destructive" />
                  <p className="text-sm text-destructive">{sendError}</p>
                </div>
              )}

              {/* Success Message */}
              {sendSuccess && (
                <div className="flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-50 p-3 dark:bg-green-950/20">
                  <CheckCircle className="size-4 text-green-600" />
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Broadcast sent successfully!
                  </p>
                </div>
              )}
            </div>

            <DialogFooter showCloseButton={!isSending && !sendSuccess}>
              <Button
                onClick={handleSendBroadcast}
                disabled={!canSend || isSending || sendSuccess}
                className="min-h-[44px]"
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Sending...
                  </>
                ) : sendSuccess ? (
                  <>
                    <CheckCircle className="mr-2 size-4" />
                    Sent!
                  </>
                ) : (
                  <>
                    <Send className="mr-2 size-4" />
                    Send to {subscriberCount} subscribers
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Warning for non-active creators */}
      {!isCreatorActive && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-50 p-4 dark:bg-amber-950/20">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Complete your creator setup to send broadcast messages.
          </p>
        </div>
      )}

      {/* No subscribers warning */}
      {isCreatorActive && subscriberCount === 0 && (
        <div className="rounded-lg border border-muted bg-muted/50 p-4">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 size-5 text-muted-foreground" />
            <div>
              <p className="font-medium">No subscribers yet</p>
              <p className="text-sm text-muted-foreground">
                Share your profile to get subscribers and start sending
                broadcasts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* DMs disabled notice */}
      {!dmEnabled && (
        <div className="rounded-lg border border-muted bg-muted/50 p-4">
          <div className="flex items-start gap-3">
            <MessageCircle className="mt-0.5 size-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Direct messages are disabled</p>
              <p className="text-sm text-muted-foreground">
                Enable DMs in your{" "}
                <Link
                  href="/creator/settings"
                  className="text-primary hover:underline"
                >
                  settings
                </Link>{" "}
                to allow subscribers to message you directly.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Tabs for Broadcasts and Conversations */}
      <Tabs defaultValue="broadcasts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="broadcasts" className="min-h-[44px]">
            <Radio className="mr-2 size-4" aria-hidden="true" />
            Broadcasts
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
          <h2 className="mb-4 text-lg font-medium">Sent Broadcasts</h2>

          {broadcasts.length === 0 && !isLoading ? (
            <div className="rounded-lg border border-border bg-card py-16 text-center">
              <MessageSquarePlus className="mx-auto size-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                No broadcasts sent yet.
              </p>
              {subscriberCount > 0 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Send your first message to connect with your subscribers.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {broadcasts.map((broadcast) => (
                <BroadcastCard key={broadcast.id} broadcast={broadcast} />
              ))}
            </div>
          )}

          {/* Loading Skeletons */}
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted" />
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-5 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}

          {/* Load More */}
          {hasMore && !isLoading && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={fetchMoreBroadcasts}>
                Load more
              </Button>
            </div>
          )}

          {/* Loading More Indicator */}
          {isLoading && broadcasts.length > 0 && (
            <div className="mt-4 flex justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </TabsContent>

        {/* Conversations Tab */}
        <TabsContent value="conversations" className="mt-6">
          <h2 className="mb-4 text-lg font-medium">Subscriber Conversations</h2>

          {conversations.length === 0 ? (
            <div className="rounded-lg border border-border bg-card py-16 text-center">
              <MessageCircle className="mx-auto size-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                No conversations yet.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {dmEnabled
                  ? "Conversations with subscribers will appear here when they message you."
                  : "Enable DMs in settings to allow subscribers to message you."}
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
function BroadcastCard({ broadcast }: { broadcast: BroadcastItem }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = broadcast.content.length > 200;
  const displayContent = isExpanded
    ? broadcast.content
    : truncateMessage(broadcast.content, 200);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Message Content - rendered as HTML since it's sanitized with DOMPurify on storage */}
      <div
        className="max-w-none text-sm text-foreground [&_a]:text-primary [&_a]:underline [&_a:hover]:text-primary/80 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-4 [&_blockquote]:italic"
        dangerouslySetInnerHTML={{ __html: displayContent }}
      />

      {isLong && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 min-h-[44px] text-sm font-medium text-primary hover:underline"
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="secondary">
          <Users className="mr-1 size-3" />
          {broadcast.recipientCount}{" "}
          {broadcast.recipientCount === 1 ? "recipient" : "recipients"}
        </Badge>
        <span className="text-muted-foreground">
          {formatMessageTime(new Date(broadcast.createdAt))}
        </span>
      </div>
    </div>
  );
}

/**
 * Conversation Card Component (for creator inbox)
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
      href={`/creator/messages/conversation/${conversation.partner.id}`}
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
            <Badge variant="outline" className="mt-1 text-xs">
              Subscriber
            </Badge>
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
        <p className="mt-2 text-sm text-muted-foreground">
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
