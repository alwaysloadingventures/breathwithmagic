/**
 * GET/POST /api/creators/[id]/subscribe
 *
 * Create a Stripe Checkout session for subscribing to a creator.
 * - GET: Creates session and redirects directly to Stripe Checkout
 * - POST: Creates session and returns checkout URL in JSON
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
 * 6. Return checkout URL or redirect
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import {
  stripe,
  getBaseUrl,
  getOrCreateCustomer,
  getOrCreatePrice,
  createSubscriptionCheckout,
  isOnboardingComplete,
  PRICE_TIER_TO_CENTS,
} from "@/lib/stripe";
import { subscriptionRateLimiter } from "@/lib/rate-limit";
import { ensureUser } from "@/lib/ensure-user";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Shared logic for creating a subscription checkout session
 * Returns either a redirect response (for GET) or JSON response (for POST)
 */
async function handleSubscribe(
  creatorId: string,
  returnJson: boolean,
): Promise<NextResponse> {
  try {
    // Verify authentication and ensure user exists
    const userResult = await ensureUser();
    if (!userResult) {
      if (returnJson) {
        return NextResponse.json(
          { error: "Please sign in to subscribe", code: "UNAUTHORIZED" },
          { status: 401 },
        );
      }
      // For GET requests, redirect to sign-in
      const baseUrl = getBaseUrl();
      return NextResponse.redirect(`${baseUrl}/sign-in`);
    }

    // Rate limit check (use clerkId for rate limiting)
    const rateLimitResult = subscriptionRateLimiter.check(
      userResult.user.clerkId,
    );
    if (!rateLimitResult.allowed) {
      if (returnJson) {
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
      // For GET, redirect back with error
      const baseUrl = getBaseUrl();
      return NextResponse.redirect(
        `${baseUrl}?error=rate_limited&retry_after=${rateLimitResult.retryAfterSeconds}`,
      );
    }

    // Get the full user with stripeCustomerId
    const user = await prisma.user.findUnique({
      where: { id: userResult.user.id },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      if (returnJson) {
        return NextResponse.json(
          { error: "User account not found", code: "USER_NOT_FOUND" },
          { status: 404 },
        );
      }
      const baseUrl = getBaseUrl();
      return NextResponse.redirect(`${baseUrl}?error=user_not_found`);
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
      if (returnJson) {
        return NextResponse.json(
          { error: "Creator not found", code: "CREATOR_NOT_FOUND" },
          { status: 404 },
        );
      }
      const baseUrl = getBaseUrl();
      return NextResponse.redirect(`${baseUrl}?error=creator_not_found`);
    }

    // Prevent subscribing to yourself
    if (creator.userId === user.id) {
      if (returnJson) {
        return NextResponse.json(
          {
            error: "You cannot subscribe to yourself",
            code: "SELF_SUBSCRIPTION",
          },
          { status: 400 },
        );
      }
      const baseUrl = getBaseUrl();
      return NextResponse.redirect(
        `${baseUrl}/${creator.handle}?error=self_subscription`,
      );
    }

    // Check creator is ready for subscriptions
    if (!creator.stripeOnboardingComplete || !creator.stripeAccountId) {
      if (returnJson) {
        return NextResponse.json(
          {
            error:
              "This creator is not yet accepting subscriptions. Please check back later.",
            code: "CREATOR_NOT_READY",
          },
          { status: 400 },
        );
      }
      const baseUrl = getBaseUrl();
      return NextResponse.redirect(
        `${baseUrl}/${creator.handle}?error=creator_not_ready`,
      );
    }

    // Real-time validation of Stripe account capabilities
    try {
      const account = await stripe.accounts.retrieve(creator.stripeAccountId);

      if (!isOnboardingComplete(account)) {
        console.error(
          `Creator ${creator.id} account ${creator.stripeAccountId} has not completed onboarding`,
          {
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
          },
        );
        if (returnJson) {
          return NextResponse.json(
            {
              error:
                "This creator is currently unable to accept new subscriptions. Please try again later.",
              code: "CREATOR_ACCOUNT_RESTRICTED",
            },
            { status: 400 },
          );
        }
        const baseUrl = getBaseUrl();
        return NextResponse.redirect(
          `${baseUrl}/${creator.handle}?error=creator_restricted`,
        );
      }
    } catch (stripeError) {
      console.error(`Failed to verify creator Stripe account:`, stripeError);
      if (returnJson) {
        return NextResponse.json(
          {
            error:
              "Unable to verify creator payment account. Please try again.",
            code: "ACCOUNT_VERIFICATION_FAILED",
          },
          { status: 502 },
        );
      }
      const baseUrl = getBaseUrl();
      return NextResponse.redirect(
        `${baseUrl}/${creator.handle}?error=verification_failed`,
      );
    }

    if (creator.status !== "active") {
      if (returnJson) {
        return NextResponse.json(
          {
            error: "This creator is not currently accepting new subscriptions",
            code: "CREATOR_INACTIVE",
          },
          { status: 400 },
        );
      }
      const baseUrl = getBaseUrl();
      return NextResponse.redirect(
        `${baseUrl}/${creator.handle}?error=creator_inactive`,
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
        if (existingSubscription.cancelAtPeriodEnd) {
          if (returnJson) {
            return NextResponse.json(
              {
                error:
                  "You have an active subscription that will end at the current period. You can reactivate it from your subscription settings.",
                code: "SUBSCRIPTION_CANCELING",
              },
              { status: 400 },
            );
          }
          const baseUrl = getBaseUrl();
          return NextResponse.redirect(
            `${baseUrl}/${creator.handle}?error=subscription_canceling`,
          );
        }
        if (returnJson) {
          return NextResponse.json(
            {
              error: "You are already subscribed to this creator",
              code: "ALREADY_SUBSCRIBED",
            },
            { status: 400 },
          );
        }
        const baseUrl = getBaseUrl();
        return NextResponse.redirect(
          `${baseUrl}/${creator.handle}?error=already_subscribed`,
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
      if (returnJson) {
        return NextResponse.json(
          {
            error: "Failed to create checkout session. Please try again.",
            code: "CHECKOUT_FAILED",
          },
          { status: 500 },
        );
      }
      return NextResponse.redirect(
        `${baseUrl}/${creator.handle}?error=checkout_failed`,
      );
    }

    // For GET requests, redirect directly to Stripe Checkout
    if (!returnJson) {
      return NextResponse.redirect(session.url);
    }

    // For POST requests, return the checkout URL as JSON
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

    const baseUrl = getBaseUrl();

    // Handle specific Stripe error types
    if (error instanceof Stripe.errors.StripeInvalidRequestError) {
      if (error.code === "resource_missing") {
        if (returnJson) {
          return NextResponse.json(
            {
              error: "Payment account not found. Please contact support.",
              code: "RESOURCE_NOT_FOUND",
            },
            { status: 400 },
          );
        }
        return NextResponse.redirect(`${baseUrl}?error=resource_not_found`);
      }
      if (returnJson) {
        return NextResponse.json(
          {
            error: "Invalid payment request. Please try again.",
            code: "INVALID_REQUEST",
          },
          { status: 400 },
        );
      }
      return NextResponse.redirect(`${baseUrl}?error=invalid_request`);
    }

    if (error instanceof Stripe.errors.StripeRateLimitError) {
      if (returnJson) {
        return NextResponse.json(
          {
            error: "Service temporarily busy. Please try again.",
            code: "RATE_LIMIT",
          },
          { status: 429 },
        );
      }
      return NextResponse.redirect(`${baseUrl}?error=stripe_rate_limited`);
    }

    if (error instanceof Stripe.errors.StripeCardError) {
      if (returnJson) {
        return NextResponse.json(
          {
            error: error.message,
            code: "CARD_ERROR",
          },
          { status: 400 },
        );
      }
      return NextResponse.redirect(`${baseUrl}?error=card_error`);
    }

    if (error instanceof Stripe.errors.StripeAPIError) {
      if (returnJson) {
        return NextResponse.json(
          {
            error: "Payment service error. Please try again later.",
            code: "STRIPE_API_ERROR",
          },
          { status: 502 },
        );
      }
      return NextResponse.redirect(`${baseUrl}?error=stripe_api_error`);
    }

    if (returnJson) {
      return NextResponse.json(
        {
          error: "Unable to start subscription. Please try again later.",
          code: "SERVER_ERROR",
        },
        { status: 500 },
      );
    }
    return NextResponse.redirect(`${baseUrl}?error=server_error`);
  }
}

/**
 * GET /api/creators/[id]/subscribe
 *
 * Creates a Stripe Checkout session and redirects the user directly to it.
 * This allows the subscribe button to work as a simple link/navigation.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { id: creatorId } = await context.params;
  return handleSubscribe(creatorId, false);
}

/**
 * POST /api/creators/[id]/subscribe
 *
 * Creates a Stripe Checkout session and returns the URL as JSON.
 * Used for programmatic API calls that need the URL response.
 */
export async function POST(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { id: creatorId } = await context.params;
  return handleSubscribe(creatorId, true);
}
