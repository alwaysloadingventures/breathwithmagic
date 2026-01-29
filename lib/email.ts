/**
 * Email Service
 *
 * Handles sending transactional emails via Resend.
 * All email functions respect user email preferences.
 *
 * Email Types:
 * - New content from subscribed creators
 * - New message received
 * - Trial ending reminders (day 5, day 6)
 * - Payment failed
 * - Subscription confirmations
 */

import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { generateUnsubscribeUrl } from "@/lib/email-tokens";

// Templates
import NewContentEmail from "@/emails/new-content";
import NewMessageEmail from "@/emails/new-message";
import TrialEndingEmail from "@/emails/trial-ending";
import PaymentFailedEmail from "@/emails/payment-failed";
import SubscriptionConfirmationEmail from "@/emails/subscription-confirmation";

// Lazy-initialized Resend client (to avoid errors when API key is missing during build)
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

// Email configuration
const FROM_EMAIL = process.env.EMAIL_FROM || "breathwithmagic <noreply@breathwithmagic.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://breathwithmagic.com";

/**
 * Email preference types that map to database columns
 */
type EmailPreferenceType =
  | "newContent"
  | "newMessage"
  | "trialReminders"
  | "paymentAlerts"
  | "subscriptionUpdates"
  | "marketing";

/**
 * Check if a user has opted in to receive a specific email type.
 * Creates default preferences if none exist.
 *
 * @param userId - The user's database ID
 * @param preferenceType - The email preference type to check
 * @returns true if user wants to receive this email type
 */
async function checkEmailPreference(
  userId: string,
  preferenceType: EmailPreferenceType,
): Promise<boolean> {
  try {
    // Get or create email preferences
    let preferences = await prisma.emailPreferences.findUnique({
      where: { userId },
    });

    // If no preferences exist, create default ones
    if (!preferences) {
      preferences = await prisma.emailPreferences.create({
        data: { userId },
      });
    }

    return preferences[preferenceType];
  } catch (error) {
    console.error("Error checking email preference:", error);
    // Default to not sending if we can't check preferences
    return false;
  }
}

/**
 * Get user email from database
 */
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return user?.email || null;
  } catch (error) {
    console.error("Error getting user email:", error);
    return null;
  }
}

/**
 * Log email send attempt (for debugging and analytics)
 */
function logEmailSend(
  type: string,
  userId: string,
  success: boolean,
  error?: string,
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    userId,
    success,
    error,
  };
  console.log("Email send:", JSON.stringify(logEntry));
}

// =============================================================================
// EMAIL SENDING FUNCTIONS
// =============================================================================

/**
 * Send a new content notification email.
 *
 * @param userId - The recipient user ID
 * @param creatorName - The creator's display name
 * @param contentTitle - The title of the new content
 * @param contentUrl - URL to the content
 */
export async function sendNewContentEmail(
  userId: string,
  creatorName: string,
  contentTitle: string,
  contentUrl: string,
): Promise<boolean> {
  try {
    // Check preference
    const shouldSend = await checkEmailPreference(userId, "newContent");
    if (!shouldSend) {
      logEmailSend("new_content", userId, false, "User opted out");
      return false;
    }

    // Get user email
    const email = await getUserEmail(userId);
    if (!email) {
      logEmailSend("new_content", userId, false, "No email found");
      return false;
    }

    // Generate unsubscribe URL
    const unsubscribeUrl = generateUnsubscribeUrl(userId, "newContent");

    // Send email
    const { error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `New from ${creatorName}: ${contentTitle}`,
      react: NewContentEmail({
        creatorName,
        contentTitle,
        contentUrl: `${APP_URL}${contentUrl}`,
        unsubscribeUrl,
      }),
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    if (error) {
      logEmailSend("new_content", userId, false, error.message);
      return false;
    }

    logEmailSend("new_content", userId, true);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logEmailSend("new_content", userId, false, message);
    return false;
  }
}

/**
 * Send a new message notification email.
 *
 * @param userId - The recipient user ID
 * @param senderName - The sender's name
 * @param messagePreview - A preview of the message content
 */
export async function sendNewMessageEmail(
  userId: string,
  senderName: string,
  messagePreview: string,
): Promise<boolean> {
  try {
    // Check preference
    const shouldSend = await checkEmailPreference(userId, "newMessage");
    if (!shouldSend) {
      logEmailSend("new_message", userId, false, "User opted out");
      return false;
    }

    // Get user email
    const email = await getUserEmail(userId);
    if (!email) {
      logEmailSend("new_message", userId, false, "No email found");
      return false;
    }

    // Generate unsubscribe URL
    const unsubscribeUrl = generateUnsubscribeUrl(userId, "newMessage");

    // Send email
    const { error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `${senderName} sent you a message`,
      react: NewMessageEmail({
        senderName,
        messagePreview: messagePreview.slice(0, 200),
        messagesUrl: `${APP_URL}/messages`,
        unsubscribeUrl,
      }),
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    if (error) {
      logEmailSend("new_message", userId, false, error.message);
      return false;
    }

    logEmailSend("new_message", userId, true);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logEmailSend("new_message", userId, false, message);
    return false;
  }
}

/**
 * Send a trial ending reminder email.
 *
 * @param userId - The subscriber user ID
 * @param creatorName - The creator's name
 * @param daysRemaining - Number of days remaining in trial (1 or 2)
 * @param subscribeUrl - URL to manage subscription
 */
export async function sendTrialEndingEmail(
  userId: string,
  creatorName: string,
  daysRemaining: number,
  subscribeUrl: string,
): Promise<boolean> {
  try {
    // Check preference
    const shouldSend = await checkEmailPreference(userId, "trialReminders");
    if (!shouldSend) {
      logEmailSend("trial_ending", userId, false, "User opted out");
      return false;
    }

    // Get user email
    const email = await getUserEmail(userId);
    if (!email) {
      logEmailSend("trial_ending", userId, false, "No email found");
      return false;
    }

    // Generate unsubscribe URL
    const unsubscribeUrl = generateUnsubscribeUrl(userId, "trialReminders");

    // Send email
    const { error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Your trial ends in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`,
      react: TrialEndingEmail({
        creatorName,
        daysRemaining,
        subscribeUrl: `${APP_URL}${subscribeUrl}`,
        unsubscribeUrl,
      }),
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    if (error) {
      logEmailSend("trial_ending", userId, false, error.message);
      return false;
    }

    logEmailSend("trial_ending", userId, true);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logEmailSend("trial_ending", userId, false, message);
    return false;
  }
}

/**
 * Send a payment failed notification email.
 *
 * @param userId - The subscriber user ID
 * @param creatorName - The creator's name
 * @param updatePaymentUrl - URL to update payment method
 */
export async function sendPaymentFailedEmail(
  userId: string,
  creatorName: string,
  updatePaymentUrl: string,
): Promise<boolean> {
  try {
    // Check preference
    const shouldSend = await checkEmailPreference(userId, "paymentAlerts");
    if (!shouldSend) {
      logEmailSend("payment_failed", userId, false, "User opted out");
      return false;
    }

    // Get user email
    const email = await getUserEmail(userId);
    if (!email) {
      logEmailSend("payment_failed", userId, false, "No email found");
      return false;
    }

    // Generate unsubscribe URL
    const unsubscribeUrl = generateUnsubscribeUrl(userId, "paymentAlerts");

    // Send email
    const { error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Action needed: Update your payment",
      react: PaymentFailedEmail({
        creatorName,
        updatePaymentUrl: `${APP_URL}${updatePaymentUrl}`,
        unsubscribeUrl,
      }),
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    if (error) {
      logEmailSend("payment_failed", userId, false, error.message);
      return false;
    }

    logEmailSend("payment_failed", userId, true);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logEmailSend("payment_failed", userId, false, message);
    return false;
  }
}

/**
 * Send a subscription confirmation email.
 *
 * @param userId - The subscriber user ID
 * @param creatorName - The creator's name
 * @param amount - The subscription amount in cents
 */
export async function sendSubscriptionConfirmationEmail(
  userId: string,
  creatorName: string,
  amount: number,
): Promise<boolean> {
  try {
    // Check preference
    const shouldSend = await checkEmailPreference(userId, "subscriptionUpdates");
    if (!shouldSend) {
      logEmailSend("subscription_confirmation", userId, false, "User opted out");
      return false;
    }

    // Get user email
    const email = await getUserEmail(userId);
    if (!email) {
      logEmailSend("subscription_confirmation", userId, false, "No email found");
      return false;
    }

    // Generate unsubscribe URL
    const unsubscribeUrl = generateUnsubscribeUrl(userId, "subscriptionUpdates");

    // Format amount
    const formattedAmount = `$${(amount / 100).toFixed(2)}`;

    // Send email
    const { error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Welcome to ${creatorName}'s community`,
      react: SubscriptionConfirmationEmail({
        creatorName,
        amount: formattedAmount,
        subscriptionsUrl: `${APP_URL}/subscriptions`,
        unsubscribeUrl,
      }),
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    if (error) {
      logEmailSend("subscription_confirmation", userId, false, error.message);
      return false;
    }

    logEmailSend("subscription_confirmation", userId, true);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logEmailSend("subscription_confirmation", userId, false, message);
    return false;
  }
}

/**
 * Send new content emails to all subscribers and followers of a creator.
 * Used when a creator publishes new content.
 *
 * @param creatorId - The creator profile ID
 * @param creatorName - The creator's display name
 * @param contentTitle - The title of the new content
 * @param contentId - The content ID for the URL
 * @returns The number of emails sent successfully
 */
export async function sendNewContentEmailsToSubscribers(
  creatorId: string,
  creatorName: string,
  contentTitle: string,
  contentId: string,
): Promise<number> {
  try {
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

    const contentUrl = `/content/${contentId}`;

    // Send emails in batches to avoid rate limits
    let successCount = 0;
    const batchSize = 10;

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map((userId) =>
          sendNewContentEmail(userId, creatorName, contentTitle, contentUrl),
        ),
      );

      successCount += results.filter(
        (r) => r.status === "fulfilled" && r.value === true,
      ).length;

      // Small delay between batches to respect rate limits
      if (i + batchSize < userIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(
      `Sent ${successCount}/${userIds.length} new content emails for content ${contentId}`,
    );
    return successCount;
  } catch (error) {
    console.error("Error sending new content emails:", error);
    return 0;
  }
}
