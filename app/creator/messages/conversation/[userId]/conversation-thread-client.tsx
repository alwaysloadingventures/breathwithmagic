"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, AlertCircle } from "lucide-react";
import {
  MAX_MESSAGE_LENGTH,
  getMessageCharacterInfo,
  formatMessageTime,
} from "@/lib/validations/message";
import { cn } from "@/lib/utils";

interface MessageItem {
  id: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  isFromMe: boolean;
  sender: {
    id: string;
    name: string;
    avatarUrl: string | null;
    handle: string | null;
  };
}

interface Partner {
  id: string;
  name: string;
  avatarUrl: string | null;
  handle: string | null;
  isCreator: boolean;
}

interface CreatorConversationThreadClientProps {
  initialMessages: MessageItem[];
  initialHasMore: boolean;
  partner: Partner;
  canSendMessage: boolean;
}

/**
 * Creator Conversation Thread Client Component
 *
 * Client component for the creator's 1:1 conversation thread with:
 * - Message history display (oldest first)
 * - Compose message form at bottom
 * - Optimistic updates for sent messages
 * - Auto-scroll to newest messages
 */
export function CreatorConversationThreadClient({
  initialMessages,
  initialHasMore,
  partner,
  canSendMessage,
}: CreatorConversationThreadClientProps) {
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Compose state
  const [messageContent, setMessageContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charInfo = getMessageCharacterInfo(messageContent);
  const canSend =
    canSendMessage &&
    messageContent.trim().length > 0 &&
    !charInfo.isOverLimit &&
    !isSending;

  // Scroll to bottom on initial load and when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  /**
   * Load older messages
   */
  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return;

    setIsLoadingMore(true);

    try {
      const oldestMessage = messages[0];
      const params = new URLSearchParams();
      params.set("cursor", oldestMessage.id);

      const response = await fetch(
        `/api/messages/conversation/${partner.id}?${params}`,
      );
      if (!response.ok) throw new Error("Failed to fetch messages");

      const data = await response.json();

      // Prepend older messages
      setMessages((prev) => [...data.items, ...prev]);
      setHasMore(!!data.nextCursor);
    } catch (err) {
      console.error("Error loading more messages:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [messages, hasMore, isLoadingMore, partner.id]);

  /**
   * Send a new message
   */
  const handleSendMessage = async () => {
    if (!canSend) return;

    const content = messageContent.trim();
    const tempId = `temp-${Date.now()}`;

    // Optimistic update
    const optimisticMessage: MessageItem = {
      id: tempId,
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
      isFromMe: true,
      sender: {
        id: "me",
        name: "You",
        avatarUrl: null,
        handle: null,
      },
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setMessageContent("");
    setSendError(null);
    setIsSending(true);

    // Focus textarea after sending
    textareaRef.current?.focus();

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: partner.id,
          content,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      // Replace optimistic message with real one
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId
            ? {
                ...optimisticMessage,
                id: data.message.id,
                createdAt: data.message.createdAt,
              }
            : msg,
        ),
      );
    } catch (err) {
      console.error("Error sending message:", err);
      setSendError(
        err instanceof Error ? err.message : "Failed to send message",
      );

      // Remove optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      setMessageContent(content); // Restore content
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Handle Enter key to send (Shift+Enter for new line)
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const partnerInitials = partner.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto py-4">
        {/* Load More Button */}
        {hasMore && (
          <div className="mb-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={loadMoreMessages}
              disabled={isLoadingMore}
              className="min-h-[44px]"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load older messages"
              )}
            </Button>
          </div>
        )}

        {/* Empty State */}
        {messages.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
            <Avatar className="mb-4 size-16 border-2 border-border">
              {partner.avatarUrl ? (
                <AvatarImage src={partner.avatarUrl} alt={partner.name} />
              ) : null}
              <AvatarFallback className="text-lg">
                {partnerInitials}
              </AvatarFallback>
            </Avatar>
            <h2 className="mb-2 text-lg font-semibold text-foreground">
              Start a conversation
            </h2>
            <p className="max-w-sm text-muted-foreground">
              Send a message to {partner.name} to start the conversation.
            </p>
          </div>
        )}

        {/* Messages List */}
        <div className="space-y-4">
          {messages.map((message, index) => {
            // Group messages by date
            const showDateSeparator =
              index === 0 ||
              !isSameDay(
                new Date(messages[index - 1].createdAt),
                new Date(message.createdAt),
              );

            return (
              <div key={message.id}>
                {showDateSeparator && (
                  <div className="my-4 flex items-center justify-center">
                    <div className="h-px flex-1 bg-border" />
                    <span className="px-3 text-xs text-muted-foreground">
                      {formatDateSeparator(new Date(message.createdAt))}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}
                <MessageBubble
                  message={message}
                  partnerAvatar={partner.avatarUrl}
                  partnerInitials={partnerInitials}
                />
              </div>
            );
          })}
        </div>

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Compose Area */}
      <div className="border-t border-border bg-card/50 py-4">
        {/* Send Error */}
        {sendError && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 px-4 py-3">
            <AlertCircle className="size-4 text-destructive" />
            <p className="text-sm text-destructive">{sendError}</p>
          </div>
        )}

        {/* Message Input */}
        {canSendMessage && (
          <div className="space-y-2">
            <div className="flex gap-3">
              <Textarea
                ref={textareaRef}
                placeholder="Type a message..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSending}
                rows={1}
                className="min-h-[48px] flex-1 resize-none"
                aria-label="Message content"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!canSend}
                className="min-h-[44px] min-w-[44px] px-3"
                aria-label="Send message"
              >
                {isSending ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Send className="size-5" />
                )}
              </Button>
            </div>

            {/* Character Count */}
            {messageContent.length > 0 && (
              <div className="flex items-center justify-end text-xs">
                <span
                  className={
                    charInfo.isOverLimit
                      ? "text-destructive"
                      : charInfo.percentUsed > 80
                        ? "text-muted-foreground/80"
                        : "text-muted-foreground"
                  }
                >
                  {charInfo.count.toLocaleString()} /{" "}
                  {MAX_MESSAGE_LENGTH.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Message Bubble Component
 */
function MessageBubble({
  message,
  partnerAvatar,
  partnerInitials,
}: {
  message: MessageItem;
  partnerAvatar: string | null;
  partnerInitials: string;
}) {
  const isFromMe = message.isFromMe;

  return (
    <div
      className={cn("flex gap-3", isFromMe ? "flex-row-reverse" : "flex-row")}
    >
      {/* Avatar - only show for partner's messages */}
      {!isFromMe && (
        <Avatar className="size-8 shrink-0 border border-border">
          {partnerAvatar ? (
            <AvatarImage src={partnerAvatar} alt={message.sender.name} />
          ) : null}
          <AvatarFallback className="text-xs">{partnerInitials}</AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          "max-w-[75%] space-y-1",
          isFromMe ? "items-end" : "items-start",
        )}
      >
        {/* Message Bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2",
            isFromMe
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md border border-border bg-card",
          )}
        >
          {/* Message Content - rendered as HTML since sanitized */}
          <div
            className={cn(
              "max-w-none text-sm [&_a]:underline [&_p]:mb-1 [&_p:last-child]:mb-0",
              isFromMe
                ? "[&_a]:text-primary-foreground/90 [&_a:hover]:text-primary-foreground"
                : "[&_a]:text-primary [&_a:hover]:text-primary/80",
            )}
            dangerouslySetInnerHTML={{ __html: message.content }}
          />
        </div>

        {/* Timestamp */}
        <p
          className={cn(
            "px-1 text-xs text-muted-foreground",
            isFromMe ? "text-right" : "text-left",
          )}
        >
          {formatMessageTime(new Date(message.createdAt))}
        </p>
      </div>

      {/* Spacer for my messages (to align with avatar on partner side) */}
      {isFromMe && <div className="size-8 shrink-0" />}
    </div>
  );
}

/**
 * Helper: Check if two dates are the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Helper: Format date separator
 */
function formatDateSeparator(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(date, today)) {
    return "Today";
  }
  if (isSameDay(date, yesterday)) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}
