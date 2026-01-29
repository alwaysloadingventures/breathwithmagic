/**
 * Message Validation Schemas
 *
 * Zod schemas for validating message data including broadcasts and DMs
 */
import { z } from "zod";

// =============================================================================
// MESSAGE SCHEMAS
// =============================================================================

/**
 * Maximum message content length
 * PRD requirement: reasonable limit for broadcast messages
 */
export const MAX_MESSAGE_LENGTH = 5000;

/**
 * Schema for sending a broadcast message
 * PRD: Creator can send message to ALL their subscribers at once
 */
export const broadcastMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message content is required")
    .max(
      MAX_MESSAGE_LENGTH,
      `Message must be ${MAX_MESSAGE_LENGTH} characters or less`,
    )
    .trim()
    .refine((val) => val.length > 0, {
      message: "Message cannot be empty or only whitespace",
    }),
});

/**
 * Schema for message list query parameters (cursor-based pagination)
 */
export const messageListQuerySchema = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.coerce.boolean().default(false),
});

/**
 * Schema for creator's sent messages query
 */
export const creatorMessagesQuerySchema = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Schema for marking messages as read
 */
export const markReadSchema = z.object({
  messageIds: z
    .array(z.string().cuid())
    .min(1, "At least one message ID is required"),
});

/**
 * Schema for marking a single message as read
 */
export const markSingleReadSchema = z.object({
  messageId: z.string().cuid(),
});

/**
 * Schema for sending a direct message (1:1 DM)
 * PRD: Subscriber can message creator (if DMs enabled), creator can reply
 */
export const directMessageSchema = z.object({
  receiverId: z.string().min(1, "Receiver ID is required"),
  content: z
    .string()
    .min(1, "Message content is required")
    .max(
      MAX_MESSAGE_LENGTH,
      `Message must be ${MAX_MESSAGE_LENGTH} characters or less`,
    )
    .trim()
    .refine((val) => val.length > 0, {
      message: "Message cannot be empty or only whitespace",
    }),
});

/**
 * Schema for conversation list query parameters
 */
export const conversationListQuerySchema = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Schema for conversation messages query parameters
 */
export const conversationMessagesQuerySchema = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type BroadcastMessage = z.infer<typeof broadcastMessageSchema>;
export type DirectMessage = z.infer<typeof directMessageSchema>;
export type ConversationListQuery = z.infer<typeof conversationListQuerySchema>;
export type ConversationMessagesQuery = z.infer<
  typeof conversationMessagesQuerySchema
>;
export type MessageListQuery = z.infer<typeof messageListQuerySchema>;
export type CreatorMessagesQuery = z.infer<typeof creatorMessagesQuerySchema>;
export type MarkRead = z.infer<typeof markReadSchema>;
export type MarkSingleRead = z.infer<typeof markSingleReadSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get character count info for message input
 */
export function getMessageCharacterInfo(content: string): {
  count: number;
  remaining: number;
  isOverLimit: boolean;
  percentUsed: number;
} {
  const count = content.length;
  const remaining = MAX_MESSAGE_LENGTH - count;
  const isOverLimit = count > MAX_MESSAGE_LENGTH;
  const percentUsed = Math.min((count / MAX_MESSAGE_LENGTH) * 100, 100);

  return { count, remaining, isOverLimit, percentUsed };
}

/**
 * Truncate message content for preview
 */
export function truncateMessage(
  content: string,
  maxLength: number = 150,
): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.slice(0, maxLength).trim() + "...";
}

/**
 * Format relative time for messages
 */
export function formatMessageTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return "Just now";
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  // For older messages, show the date
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
