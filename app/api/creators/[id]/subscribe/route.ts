/**
 * POST /api/creators/[id]/subscribe
 *
 * Create a Stripe Checkout session for subscribing to a creator.
 * Returns a URL to redirect the user to for payment.
 *
 * Requirements:
 * - User must be authenticated
 * - Creator must exist and have Stripe onboarding complete
 * - User cannot already be subscribed to this creator
 *
 * Flow:
 * 1. Validate user authentication
 * 2. Validate creator exists and is ready for subscriptions
 * 3. Get or create Stripe customer for user
 * 4. Get or create price for creator's tier
 * 5. Create checkout session with platform fee
 * 6. Return checkout URL
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import {
  stripe,
  getBaseUrl,
  getOrCreateCustomer,
  getOrCreatePrice,
  createSubscriptionCheckout,
  PRICE_TIER_TO_CENTS,
} from "@/lib/stripe";
import { subscriptionRateLimiter } from "@/lib/rate-limit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    // Get creator ID from route params
    const { id: creatorId } = await context.params;

    // Verify authentication
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(
        { error: "Please sign in to subscribe", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // Rate limit check
    const rateLimitResult = subscriptionRateLimiter.check(clerkId);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many subscription attempts. Please try again later.",
          code: "RATE_LIMITED",
          retryAfter: rateLimitResult.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfterSeconds),
          },
        },
      );
    }

    // Get the current user
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User account not found", code: "USER_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Get the creator profile
    const creator = await prisma.creatorProfile.findUnique({
      where: { id: creatorId },
      select: {
        id: true,
        handle: true,
        displayName: true,
        subscriptionPrice: true,
        trialEnabled: true,
        stripeAccountId: true,
        stripeOnboardingComplete: true,
        status: true,
        userId: true,
      },
    });

    if (!creator) {
      return NextResponse.json(
        { error: "Creator not found", code: "CREATOR_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Prevent subscribing to yourself
    if (creator.userId === user.id) {
      return NextResponse.json(
        {
          error: "You cannot subscribe to yourself",
          code: "SELF_SUBSCRIPTION",
        },
        { status: 400 },
      );
    }

    // Check creator is ready for subscriptions
    if (!creator.stripeOnboardingComplete || !creator.stripeAccountId) {
      return NextResponse.json(
        {
          error:
            "This creator is not yet accepting subscriptions. Please check back later.",
          code: "CREATOR_NOT_READY",
        },
        { status: 400 },
      );
    }

    // Real-time validation of Stripe account capabilities
    // This catches cases where the account was disabled after onboarding
    try {
      const account = await stripe.accounts.retrieve(creator.stripeAccountId);

      if (!account.charges_enabled) {
        console.error(
          `Creator ${creator.id} account ${creator.stripeAccountId} cannot accept charges`,
        );
        return NextResponse.json(
          {
            error:
              "This creator is currently unable to accept new subscriptions. Please try again later.",
            code: "CREATOR_ACCOUNT_RESTRICTED",
          },
          { status: 400 },
        );
      }
    } catch (stripeError) {
      console.error(`Failed to verify creator Stripe account:`, stripeError);
      return NextResponse.json(
        {
          error: "Unable to verify creator payment account. Please try again.",
          code: "ACCOUNT_VERIFICATION_FAILED",
        },
        { status: 502 },
      );
    }

    if (creator.status !== "active") {
      return NextResponse.json(
        {
          error: "This creator is not currently accepting new subscriptions",
          code: "CREATOR_INACTIVE",
        },
        { status: 400 },
      );
    }

    // Check if user already has an active subscription to this creator
    const existingSubscription = await prisma.subscription.findUnique({
      where: {
        userId_creatorId: {
          userId: user.id,
          creatorId: creator.id,
        },
      },
      select: {
        id: true,
        status: true,
        cancelAtPeriodEnd: true,
      },
    });

    if (existingSubscription) {
      if (
        existingSubscription.status === "active" ||
        existingSubscription.status === "trialing"
      ) {
        // If they're already subscribed but canceling, let them know
        if (existingSubscription.cancelAtPeriodEnd) {
          return NextResponse.json(
            {
              error:
                "You have an active subscription that will end at the current period. You can reactivate it from your subscription settings.",
              code: "SUBSCRIPTION_CANCELING",
            },
            { status: 400 },
          );
        }
        return NextResponse.json(
          {
            error: "You are already subscribed to this creator",
            code: "ALREADY_SUBSCRIBED",
          },
          { status: 400 },
        );
      }
    }

    // Get or create Stripe customer
    const stripeCustomerId = await getOrCreateCustomer(
      user.email,
      user.id,
      user.stripeCustomerId,
    );

    // Save customer ID to user if it's new
    if (user.stripeCustomerId !== stripeCustomerId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });
    }

    // Get or create price for this tier on the platform account
    // Note: Prices are created on the platform, funds are routed via transfer_data
    const priceId = await getOrCreatePrice(creator.subscriptionPrice);

    // Build URLs for success/cancel
    const baseUrl = getBaseUrl();
    const successUrl = `${baseUrl}/${creator.handle}?subscribed=true`;
    const cancelUrl = `${baseUrl}/${creator.handle}?subscribe_cancelled=true`;

    // Create checkout session
    const session = await createSubscriptionCheckout({
      customerId: stripeCustomerId,
      priceId,
      creatorStripeAccountId: creator.stripeAccountId,
      creatorId: creator.id,
      userId: user.id,
      trialPeriodDays: creator.trialEnabled ? 7 : undefined,
      successUrl,
      cancelUrl,
    });

    if (!session.url) {
      console.error("Stripe checkout session created without URL", {
        sessionId: session.id,
      });
      return NextResponse.json(
        {
          error: "Failed to create checkout session. Please try again.",
          code: "CHECKOUT_FAILED",
        },
        { status: 500 },
      );
    }

    // Return the checkout URL
    const priceInDollars = PRICE_TIER_TO_CENTS[creator.subscriptionPrice] / 100;
    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      creator: {
        handle: creator.handle,
        displayName: creator.displayName,
      },
      subscription: {
        price: priceInDollars,
        trialDays: creator.trialEnabled ? 7 : 0,
      },
    });
  } catch (error) {
    console.error("Error creating subscription checkout:", error);

    // Handle specific Stripe error types
    if (error instanceof Stripe.errors.StripeInvalidRequestError) {
      if (error.code === "resource_missing") {
        return NextResponse.json(
          {
            error: "Payment account not found. Please contact support.",
            code: "RESOURCE_NOT_FOUND",
          },
          { status: 400 },
        );
      }
      return NextResponse.json(
        {
          error: "Invalid payment request. Please try again.",
          code: "INVALID_REQUEST",
        },
        { status: 400 },
      );
    }

    if (error instanceof Stripe.errors.StripeRateLimitError) {
      return NextResponse.json(
        {
          error: "Service temporarily busy. Please try again.",
          code: "RATE_LIMIT",
        },
        { status: 429 },
      );
    }

    if (error instanceof Stripe.errors.StripeCardError) {
      return NextResponse.json(
        {
          error: error.message,
          code: "CARD_ERROR",
        },
        { status: 400 },
      );
    }

    if (error instanceof Stripe.errors.StripeAPIError) {
      return NextResponse.json(
        {
          error: "Payment service error. Please try again later.",
          code: "STRIPE_API_ERROR",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        error: "Unable to start subscription. Please try again later.",
        code: "SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}
