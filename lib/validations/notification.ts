/**
 * Notification Validation Schemas
 *
 * Zod schemas for validating notification-related requests
 */
import { z } from "zod";

// =============================================================================
// NOTIFICATION SCHEMAS
// =============================================================================

/**
 * Schema for notification list query parameters (cursor-based pagination)
 * PRD: cursor-based pagination (limit default 20, max 100)
 */
export const notificationListQuerySchema = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Schema for marking notifications as read
 * PRD: Body: { notificationIds: string[] } (max 50) OR { all: true }
 */
export const markNotificationsReadSchema = z
  .object({
    notificationIds: z
      .array(z.string().cuid())
      .min(1)
      .max(50, "Maximum 50 notifications can be marked at once")
      .optional(),
    all: z.literal(true).optional(),
  })
  .refine((data) => data.notificationIds !== undefined || data.all === true, {
    message: "Either notificationIds or all: true must be provided",
  });

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;
export type MarkNotificationsRead = z.infer<typeof markNotificationsReadSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format relative time for notifications
 * Consistent with message time formatting
 */
export function formatNotificationTime(date: Date): string {
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

  // For older notifications, show the date
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Truncate notification body for preview
 */
export function truncateNotificationBody(
  body: string,
  maxLength: number = 100,
): string {
  if (body.length <= maxLength) {
    return body;
  }
  return body.slice(0, maxLength).trim() + "...";
}
