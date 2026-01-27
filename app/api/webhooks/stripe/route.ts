/**
 * POST /api/webhooks/stripe
 *
 * Handle Stripe webhook events with signature verification and idempotency.
 *
 * SECURITY REQUIREMENTS:
 * 1. Signature verification using stripe.webhooks.constructEvent()
 * 2. Idempotency handling using ProcessedWebhookEvent table
 *    - Events are marked as processed AFTER successful handling to prevent data loss
 * 3. Return 200 quickly to avoid Stripe retries
 *
 * Handled Events:
 * Account Events:
 * - account.updated: Check if onboarding complete, update profile status
 * - account.application.deauthorized: Handle creator disconnecting
 *
 * Subscription Events:
 * - checkout.session.completed: Create subscription record
 * - customer.subscription.created: Confirm subscription in DB
 * - customer.subscription.updated: Update status, period dates, cancel flag
 * - customer.subscription.deleted: Mark subscription as canceled
 * - customer.subscription.trial_will_end: Log for notification (Phase 5)
 *
 * Invoice Events:
 * - invoice.payment_failed: Set subscription to past_due
 * - invoice.paid: Recover subscription from past_due to active
 */
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  stripe,
  isOnboardingComplete,
  PRICE_TIER_TO_CENTS,
} from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type { Stripe } from "stripe";
import type { SubscriptionStatus } from "@prisma/client";

/**
 * Disable body parsing - we need the raw body for signature verification
 */
export const dynamic = "force-dynamic";

/**
 * Check if an event has already been processed (idempotency check).
 *
 * @param eventId - The Stripe event ID
 * @returns true if event was already processed, false if it's new
 */
async function isEventAlreadyProcessed(eventId: string): Promise<boolean> {
  const existingEvent = await prisma.processedWebhookEvent.findUnique({
    where: { eventId },
  });
  return existingEvent !== null;
}

/**
 * Mark an event as processed AFTER successful handling.
 * This ensures we don't mark events as processed if handling fails.
 *
 * @param eventId - The Stripe event ID
 * @param eventType - The type of event
 */
async function markEventProcessed(
  eventId: string,
  eventType: string,
): Promise<void> {
  try {
    await prisma.processedWebhookEvent.create({
      data: { eventId, eventType },
    });
  } catch (error: unknown) {
    // P2002 is Prisma's unique constraint violation error
    // If event was already processed (race condition), that's fine
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      console.log(
        `Event ${eventId} was already marked as processed (race condition handled)`,
      );
      return;
    }
    throw error; // Real error, re-throw
  }
}

/**
 * Handle account.updated event
 * Check if onboarding is now complete and update the creator profile
 */
async function handleAccountUpdated(account: Stripe.Account): Promise<void> {
  // Find creator profile by Stripe account ID
  const profile = await prisma.creatorProfile.findFirst({
    where: { stripeAccountId: account.id },
    select: {
      id: true,
      stripeOnboardingComplete: true,
      status: true,
    },
  });

  if (!profile) {
    console.warn(`Received account.updated for unknown account: ${account.id}`);
    return;
  }

  // Check if onboarding just became complete
  const complete = isOnboardingComplete(account);

  if (complete && !profile.stripeOnboardingComplete) {
    // Update profile to active status
    await prisma.creatorProfile.update({
      where: { id: profile.id },
      data: {
        stripeOnboardingComplete: true,
        status: "active",
      },
    });

    console.log(
      `Creator ${profile.id} Stripe onboarding complete, status set to active`,
    );
  } else if (!complete && profile.stripeOnboardingComplete) {
    // Account was complete but now isn't (rare, but handle it)
    // This could happen if Stripe needs additional verification
    await prisma.creatorProfile.update({
      where: { id: profile.id },
      data: {
        stripeOnboardingComplete: false,
        // Keep status as active - don't suddenly break their profile
        // They'll see a banner to complete additional verification
      },
    });

    console.log(
      `Creator ${profile.id} Stripe account needs additional verification`,
    );
  }
}

/**
 * Handle account.application.deauthorized event
 * Creator has disconnected their Stripe account from the platform
 *
 * Note: The deauthorized event contains an Application object, not an Account.
 * We extract the account ID from the event's account field.
 */
async function handleAccountDeauthorized(accountId: string): Promise<void> {
  // Find creator profile by Stripe account ID
  const profile = await prisma.creatorProfile.findFirst({
    where: { stripeAccountId: accountId },
    select: {
      id: true,
      handle: true,
    },
  });

  if (!profile) {
    console.warn(
      `Received account.application.deauthorized for unknown account: ${accountId}`,
    );
    return;
  }

  // Clear Stripe account info and deactivate
  await prisma.creatorProfile.update({
    where: { id: profile.id },
    data: {
      stripeAccountId: null,
      stripeOnboardingComplete: false,
      status: "deactivated",
    },
  });

  console.log(
    `Creator ${profile.handle} (${profile.id}) disconnected Stripe account, status set to deactivated`,
  );

  // TODO: In future, could send notification email to creator
  // TODO: Could also notify active subscribers that creator is inactive
}

// =============================================================================
// SUBSCRIPTION EVENT HANDLERS
// =============================================================================

/**
 * Helper to extract period dates from a Stripe subscription.
 * In Stripe API 2024+ (SDK v20+), period dates are on subscription ITEMS, not the subscription itself.
 */
function getSubscriptionPeriodDates(subscription: Stripe.Subscription): {
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
} {
  // In Stripe SDK v20+, period dates are on subscription items
  const firstItem = subscription.items?.data?.[0];
  if (firstItem?.current_period_start && firstItem?.current_period_end) {
    return {
      currentPeriodStart: new Date(firstItem.current_period_start * 1000),
      currentPeriodEnd: new Date(firstItem.current_period_end * 1000),
    };
  }

  // If we can't find period dates, return nulls (shouldn't happen in practice)
  console.warn(
    `Could not extract period dates from subscription ${subscription.id}`,
  );
  return {
    currentPeriodStart: null,
    currentPeriodEnd: null,
  };
}

/**
 * Handle checkout.session.completed event
 * Creates the subscription record in our database
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  // Only handle subscription checkouts
  if (session.mode !== "subscription") {
    console.log(`Ignoring non-subscription checkout: ${session.id}`);
    return;
  }

  const { creatorId, userId } = session.metadata || {};

  if (!creatorId || !userId) {
    console.error(
      `checkout.session.completed missing required metadata: ${session.id}`,
      { creatorId, userId },
    );
    return;
  }

  // Get the subscription from Stripe
  const stripeSubscriptionId = session.subscription as string;
  if (!stripeSubscriptionId) {
    console.error(
      `checkout.session.completed missing subscription ID: ${session.id}`,
    );
    return;
  }

  // Retrieve full subscription details
  const stripeSubscription =
    await stripe.subscriptions.retrieve(stripeSubscriptionId);

  // Get creator to determine price at purchase
  const creator = await prisma.creatorProfile.findUnique({
    where: { id: creatorId },
    select: { subscriptionPrice: true },
  });

  if (!creator) {
    console.error(
      `checkout.session.completed: Creator not found: ${creatorId}`,
    );
    return;
  }

  const priceAtPurchase = PRICE_TIER_TO_CENTS[creator.subscriptionPrice];

  // Determine initial status based on trial
  const status: SubscriptionStatus =
    stripeSubscription.status === "trialing" ? "trialing" : "active";

  // Extract period dates from subscription
  const { currentPeriodStart, currentPeriodEnd } =
    getSubscriptionPeriodDates(stripeSubscription);

  // Create or update subscription record
  // Use upsert to handle race conditions with subscription.created event
  await prisma.subscription.upsert({
    where: {
      userId_creatorId: {
        userId,
        creatorId,
      },
    },
    create: {
      userId,
      creatorId,
      stripeSubscriptionId,
      status,
      priceAtPurchase,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    },
    update: {
      stripeSubscriptionId,
      status,
      priceAtPurchase,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    },
  });

  console.log(
    `Subscription created: user ${userId} -> creator ${creatorId} (${status})`,
  );
}

/**
 * Handle customer.subscription.created event
 * Confirms subscription exists in DB, creates if missing
 */
async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
): Promise<void> {
  const { creatorId, userId } = subscription.metadata || {};

  if (!creatorId || !userId) {
    // This might be a subscription not from our platform, ignore
    console.log(
      `Ignoring subscription.created without breathwithmagic metadata: ${subscription.id}`,
    );
    return;
  }

  // Get creator price for grandfathered pricing
  const creator = await prisma.creatorProfile.findUnique({
    where: { id: creatorId },
    select: { subscriptionPrice: true },
  });

  if (!creator) {
    console.error(`subscription.created: Creator not found: ${creatorId}`);
    return;
  }

  const priceAtPurchase = PRICE_TIER_TO_CENTS[creator.subscriptionPrice];
  const status: SubscriptionStatus =
    subscription.status === "trialing" ? "trialing" : "active";

  // Extract period dates from subscription
  const { currentPeriodStart, currentPeriodEnd } =
    getSubscriptionPeriodDates(subscription);

  // Upsert to handle race with checkout.session.completed
  await prisma.subscription.upsert({
    where: {
      userId_creatorId: {
        userId,
        creatorId,
      },
    },
    create: {
      userId,
      creatorId,
      stripeSubscriptionId: subscription.id,
      status,
      priceAtPurchase,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    update: {
      stripeSubscriptionId: subscription.id,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  console.log(`Subscription confirmed: ${subscription.id} (${status})`);
}

/**
 * Map Stripe subscription status to our SubscriptionStatus enum
 */
function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete":
    case "incomplete_expired":
      return "canceled";
    default:
      return "active";
  }
}

/**
 * Handle customer.subscription.updated event
 * Updates status, period dates, and cancel flag
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
): Promise<void> {
  // Find by Stripe subscription ID
  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
    select: { id: true, status: true },
  });

  // Extract period dates from subscription
  const { currentPeriodStart, currentPeriodEnd } =
    getSubscriptionPeriodDates(subscription);

  if (!dbSubscription) {
    // Try to find by metadata if stripeSubscriptionId wasn't set yet
    const { creatorId, userId } = subscription.metadata || {};
    if (creatorId && userId) {
      const byUserCreator = await prisma.subscription.findUnique({
        where: {
          userId_creatorId: { userId, creatorId },
        },
        select: { id: true },
      });

      if (byUserCreator) {
        // Update with the subscription ID
        await prisma.subscription.update({
          where: { id: byUserCreator.id },
          data: {
            stripeSubscriptionId: subscription.id,
            status: mapStripeStatus(subscription.status),
            currentPeriodStart,
            currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
        });
        console.log(`Subscription updated (by metadata): ${subscription.id}`);
        return;
      }
    }

    console.warn(
      `subscription.updated: Subscription not found in DB: ${subscription.id}`,
    );
    return;
  }

  const newStatus = mapStripeStatus(subscription.status);

  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      status: newStatus,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  console.log(
    `Subscription updated: ${subscription.id} (${dbSubscription.status} -> ${newStatus})`,
  );
}

/**
 * Handle customer.subscription.deleted event
 * Marks subscription as canceled
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
    select: { id: true, userId: true, creatorId: true },
  });

  if (!dbSubscription) {
    console.warn(
      `subscription.deleted: Subscription not found in DB: ${subscription.id}`,
    );
    return;
  }

  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      status: "canceled",
      cancelAtPeriodEnd: false,
    },
  });

  console.log(
    `Subscription deleted: ${subscription.id} (user ${dbSubscription.userId} -> creator ${dbSubscription.creatorId})`,
  );

  // TODO (Phase 5): Send notification to user that subscription ended
}

/**
 * Handle customer.subscription.trial_will_end event
 * Logs for notification system (Phase 5)
 */
async function handleTrialWillEnd(
  subscription: Stripe.Subscription,
): Promise<void> {
  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
    select: { id: true, userId: true, creatorId: true },
  });

  if (!dbSubscription) {
    console.warn(
      `trial_will_end: Subscription not found in DB: ${subscription.id}`,
    );
    return;
  }

  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000)
    : null;

  console.log(
    `Trial ending soon: ${subscription.id} (ends ${trialEnd?.toISOString()})`,
  );

  // TODO (Phase 5): Create notification for user
  // await prisma.notification.create({
  //   data: {
  //     userId: dbSubscription.userId,
  //     type: 'trial_ending',
  //     title: 'Your trial is ending soon',
  //     body: 'Your free trial ends in 3 days. Subscribe to keep access.',
  //     link: '/subscriptions',
  //   },
  // });
}

/**
 * Helper to extract subscription ID from an invoice.
 * In Stripe SDK v20+, subscription is at invoice.parent?.subscription_details?.subscription
 */
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  // In Stripe SDK v20+, subscription is in parent.subscription_details
  const subscriptionDetails = invoice.parent?.subscription_details;
  if (subscriptionDetails?.subscription) {
    // Can be string or full Subscription object
    const sub = subscriptionDetails.subscription;
    return typeof sub === "string" ? sub : sub.id;
  }

  return null;
}

/**
 * Handle invoice.payment_failed event
 * Sets subscription to past_due status
 */
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
): Promise<void> {
  const subscriptionId = getInvoiceSubscriptionId(invoice);

  if (!subscriptionId) {
    console.log(`Ignoring payment_failed without subscription: ${invoice.id}`);
    return;
  }

  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
    select: { id: true, userId: true, creatorId: true },
  });

  if (!dbSubscription) {
    console.warn(
      `payment_failed: Subscription not found in DB: ${subscriptionId}`,
    );
    return;
  }

  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: { status: "past_due" },
  });

  console.log(
    `Payment failed, subscription past_due: ${subscriptionId} (user ${dbSubscription.userId})`,
  );

  // TODO (Phase 5): Create notification for user
  // await prisma.notification.create({
  //   data: {
  //     userId: dbSubscription.userId,
  //     type: 'payment_failed',
  //     title: 'Payment failed',
  //     body: 'We couldn\'t process your payment. Please update your payment method.',
  //     link: '/subscriptions',
  //   },
  // });
}

/**
 * Handle invoice.paid event
 * Handles payment recovery from past_due status back to active.
 */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = getInvoiceSubscriptionId(invoice);

  if (!subscriptionId) {
    console.log(`Ignoring invoice.paid without subscription: ${invoice.id}`);
    return;
  }

  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
    select: { id: true, status: true, userId: true },
  });

  if (!dbSubscription) {
    // Subscription might not exist yet (first invoice during checkout)
    console.log(
      `invoice.paid: Subscription not found in DB: ${subscriptionId}`,
    );
    return;
  }

  // If recovering from past_due, update to active
  if (dbSubscription.status === "past_due") {
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: { status: "active" },
    });
    console.log(
      `Payment recovered, subscription reactivated: ${subscriptionId} (user ${dbSubscription.userId})`,
    );

    // TODO (Phase 5): Create notification for user
    // await prisma.notification.create({
    //   data: {
    //     userId: dbSubscription.userId,
    //     type: 'payment_recovered',
    //     title: 'Payment successful',
    //     body: 'Your subscription has been reactivated.',
    //     link: '/subscriptions',
    //   },
    // });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();

    // Get the signature from headers
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      console.error("Missing stripe-signature header");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Verify webhook secret is configured
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 },
      );
    }

    // Verify the signature and construct the event
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`Webhook signature verification failed: ${message}`);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${message}` },
        { status: 400 },
      );
    }

    // Check if event was already processed (idempotency - read-only check)
    const alreadyProcessed = await isEventAlreadyProcessed(event.id);
    if (alreadyProcessed) {
      console.log(`Event ${event.id} already processed, skipping`);
      return NextResponse.json({ received: true, status: "already_processed" });
    }

    // Process the event based on type
    console.log(`Processing Stripe event: ${event.type} (${event.id})`);

    switch (event.type) {
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(account);
        break;
      }

      case "account.application.deauthorized": {
        // For deauthorized events, the account ID is in event.account
        // The event.data.object is an Application object, not Account
        const accountId = event.account;
        if (accountId) {
          await handleAccountDeauthorized(accountId);
        } else {
          console.warn(
            "account.application.deauthorized event missing account ID",
          );
        }
        break;
      }

      // =================================================================
      // SUBSCRIPTION EVENTS
      // =================================================================

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(subscription);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleTrialWillEnd(subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      // Future handlers for refunds/disputes (Phase 5+)
      // case "charge.refunded":
      // case "charge.dispute.created":
      // case "charge.dispute.closed":

      default:
        // Log unhandled events for debugging, but don't fail
        console.log(`Unhandled event type: ${event.type}`);
    }

    // ONLY mark as processed AFTER successful handling
    // This ensures we don't lose events if handling fails
    await markEventProcessed(event.id, event.type);

    // Return 200 quickly to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing Stripe webhook:", error);

    // Return 500 to trigger Stripe retry (for transient errors)
    // But be careful - we don't want infinite retries for permanent errors
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
