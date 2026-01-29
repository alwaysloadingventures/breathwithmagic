/**
 * Notification Helper Functions
 *
 * Utility functions for creating and managing notifications.
 * These helpers handle notification creation and Redis cache invalidation.
 *
 * Integration Points (to be wired up later):
 * - New content published -> notify followers/subscribers
 * - New message received -> notify recipient
 * - Subscription renewed -> notify subscriber
 * - Trial ending (day 5, day 6) -> notify subscriber
 * - Payment failed -> notify subscriber
 */

import { prisma } from "@/lib/prisma";
import { invalidateNotificationCache } from "@/lib/cache";
import type { NotificationType } from "@prisma/client";

/**
 * Notification type configuration
 * Maps notification types to their display properties
 */
export const NOTIFICATION_CONFIG: Record<
  NotificationType,
  {
    icon: string;
    defaultTitle: string;
    color: string;
  }
> = {
  new_content: {
    icon: "play",
    defaultTitle: "New content available",
    color: "text-primary",
  },
  new_message: {
    icon: "message",
    defaultTitle: "New message",
    color: "text-primary",
  },
  subscription_renewed: {
    icon: "check-circle",
    defaultTitle: "Subscription renewed",
    color: "text-green-600",
  },
  trial_ending: {
    icon: "clock",
    defaultTitle: "Trial ending soon",
    color: "text-amber-600",
  },
  payment_failed: {
    icon: "alert-circle",
    defaultTitle: "Payment failed",
    color: "text-destructive",
  },
};

/**
 * Create a notification for a user
 *
 * @param userId - The user ID to notify
 * @param type - The notification type
 * @param title - The notification title
 * @param body - The notification body text
 * @param link - Optional link to navigate to when clicked
 * @returns The created notification
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string,
) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        link,
        isRead: false,
      },
    });

    // Invalidate the Redis cache for this user's notification count
    await invalidateNotificationCache(userId);

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

/**
 * Create notifications for multiple users (batch)
 * Useful for notifying all followers/subscribers of a creator
 *
 * @param userIds - Array of user IDs to notify
 * @param type - The notification type
 * @param title - The notification title
 * @param body - The notification body text
 * @param link - Optional link to navigate to when clicked
 * @returns The count of created notifications
 */
export async function createBatchNotifications(
  userIds: string[],
  type: NotificationType,
  title: string,
  body: string,
  link?: string,
): Promise<number> {
  if (userIds.length === 0) return 0;

  try {
    // Create all notifications in a single transaction
    const result = await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type,
        title,
        body,
        link,
        isRead: false,
      })),
    });

    // Invalidate cache for all affected users
    await Promise.all(
      userIds.map((userId) => invalidateNotificationCache(userId)),
    );

    return result.count;
  } catch (error) {
    console.error("Error creating batch notifications:", error);
    throw error;
  }
}

// =============================================================================
// NOTIFICATION CREATION HELPERS FOR SPECIFIC EVENTS
// =============================================================================

/**
 * Notify followers/subscribers when a creator publishes new content
 *
 * @param creatorId - The creator profile ID
 * @param creatorName - The creator's display name
 * @param contentTitle - The title of the new content
 * @param contentId - The content ID for the link
 */
export async function notifyNewContent(
  creatorId: string,
  creatorName: string,
  contentTitle: string,
  contentId: string,
): Promise<number> {
  // Get all active subscribers and followers
  const [subscribers, followers] = await Promise.all([
    prisma.subscription.findMany({
      where: {
        creatorId,
        status: { in: ["active", "trialing"] },
      },
      select: { userId: true },
    }),
    prisma.follow.findMany({
      where: { creatorId },
      select: { userId: true },
    }),
  ]);

  // Combine and deduplicate user IDs
  const userIds = [
    ...new Set([
      ...subscribers.map((s) => s.userId),
      ...followers.map((f) => f.userId),
    ]),
  ];

  if (userIds.length === 0) return 0;

  return createBatchNotifications(
    userIds,
    "new_content",
    `${creatorName} posted new content`,
    contentTitle,
    `/content/${contentId}`,
  );
}

/**
 * Notify a user when they receive a new message
 *
 * @param userId - The recipient user ID
 * @param senderName - The sender's name
 * @param messagePreview - A preview of the message content
 * @param conversationLink - Link to the conversation
 */
export async function notifyNewMessage(
  userId: string,
  senderName: string,
  messagePreview: string,
  conversationLink?: string,
): Promise<void> {
  await createNotification(
    userId,
    "new_message",
    `New message from ${senderName}`,
    messagePreview.slice(0, 100) + (messagePreview.length > 100 ? "..." : ""),
    conversationLink || "/messages",
  );
}

/**
 * Notify a subscriber when their subscription is renewed
 *
 * @param userId - The subscriber user ID
 * @param creatorName - The creator's name
 * @param creatorHandle - The creator's handle for the link
 */
export async function notifySubscriptionRenewed(
  userId: string,
  creatorName: string,
  creatorHandle: string,
): Promise<void> {
  await createNotification(
    userId,
    "subscription_renewed",
    "Subscription renewed",
    `Your subscription to ${creatorName} has been renewed. Enjoy unlimited access to their content.`,
    `/${creatorHandle}`,
  );
}

/**
 * Notify a subscriber when their trial is ending
 *
 * @param userId - The subscriber user ID
 * @param creatorName - The creator's name
 * @param daysRemaining - Number of days remaining in trial
 * @param creatorHandle - The creator's handle for the link
 */
export async function notifyTrialEnding(
  userId: string,
  creatorName: string,
  daysRemaining: number,
  creatorHandle: string,
): Promise<void> {
  await createNotification(
    userId,
    "trial_ending",
    `Trial ending in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`,
    `Your free trial with ${creatorName} will end soon. Subscribe to keep access to their content.`,
    `/${creatorHandle}`,
  );
}

/**
 * Notify a subscriber when a payment fails
 *
 * @param userId - The subscriber user ID
 * @param creatorName - The creator's name
 */
export async function notifyPaymentFailed(
  userId: string,
  creatorName: string,
): Promise<void> {
  await createNotification(
    userId,
    "payment_failed",
    "Payment failed",
    `We couldn't process your payment for ${creatorName}. Please update your payment method to maintain access.`,
    "/subscriptions",
  );
}
