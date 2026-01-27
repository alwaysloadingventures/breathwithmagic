/**
 * DELETE /api/subscriptions/[id]
 *
 * Cancel a subscription (sets cancelAtPeriodEnd: true).
 * User retains access until the current billing period ends.
 *
 * GET /api/subscriptions/[id]
 *
 * Get details of a specific subscription.
 *
 * PATCH /api/subscriptions/[id]
 *
 * Reactivate a subscription that was set to cancel at period end.
 * Sets cancelAtPeriodEnd: false in both Stripe and database.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import {
  cancelSubscriptionAtPeriodEnd,
  reactivateSubscription,
} from "@/lib/stripe";
import { subscriptionRateLimiter } from "@/lib/rate-limit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET - Get subscription details
 */
export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id: subscriptionId } = await context.params;

    // Verify authentication
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(
        {
          error: "Please sign in to view subscription details",
          code: "UNAUTHORIZED",
        },
        { status: 401 },
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Get subscription with creator details
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        creator: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatarUrl: true,
            category: true,
            subscriptionPrice: true,
          },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found", code: "SUBSCRIPTION_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Verify ownership
    if (subscription.userId !== user.id) {
      return NextResponse.json(
        { error: "Subscription not found", code: "SUBSCRIPTION_NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: subscription.id,
      status: subscription.status,
      priceAtPurchase: subscription.priceAtPurchase,
      currentPeriodStart:
        subscription.currentPeriodStart?.toISOString() || null,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() || null,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      createdAt: subscription.createdAt.toISOString(),
      creator: {
        id: subscription.creator.id,
        handle: subscription.creator.handle,
        displayName: subscription.creator.displayName,
        avatarUrl: subscription.creator.avatarUrl,
        category: subscription.creator.category,
        currentPrice: subscription.creator.subscriptionPrice,
      },
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}

/**
 * DELETE - Cancel subscription at period end
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id: subscriptionId } = await context.params;

    // Verify authentication
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(
        {
          error: "Please sign in to cancel subscription",
          code: "UNAUTHORIZED",
        },
        { status: 401 },
      );
    }

    // Rate limit check
    const rateLimitResult = subscriptionRateLimiter.check(clerkId);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many cancellation attempts. Please try again later.",
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

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: {
        id: true,
        userId: true,
        stripeSubscriptionId: true,
        status: true,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: true,
        creator: {
          select: {
            displayName: true,
          },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found", code: "SUBSCRIPTION_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Verify ownership
    if (subscription.userId !== user.id) {
      return NextResponse.json(
        { error: "Subscription not found", code: "SUBSCRIPTION_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Check if already canceled
    if (subscription.status === "canceled") {
      return NextResponse.json(
        {
          error: "This subscription is already canceled",
          code: "ALREADY_CANCELED",
        },
        { status: 400 },
      );
    }

    if (subscription.cancelAtPeriodEnd) {
      return NextResponse.json(
        {
          error:
            "This subscription is already set to cancel at the end of the billing period",
          code: "ALREADY_CANCELING",
        },
        { status: 400 },
      );
    }

    // Cancel in Stripe FIRST (if we have a Stripe subscription ID)
    // Only update database AFTER Stripe succeeds to ensure consistency
    if (subscription.stripeSubscriptionId) {
      try {
        await cancelSubscriptionAtPeriodEnd(subscription.stripeSubscriptionId);
      } catch (stripeError) {
        console.error("Stripe cancellation error:", stripeError);

        // Handle specific Stripe error types
        if (stripeError instanceof Stripe.errors.StripeInvalidRequestError) {
          if (stripeError.code === "resource_missing") {
            // Subscription doesn't exist in Stripe - this is okay, proceed with DB update
            console.log(
              `Subscription ${subscription.stripeSubscriptionId} not found in Stripe, updating DB only`,
            );
          } else {
            return NextResponse.json(
              {
                error: "Invalid cancellation request. Please contact support.",
                code: "INVALID_REQUEST",
              },
              { status: 400 },
            );
          }
        } else if (stripeError instanceof Stripe.errors.StripeRateLimitError) {
          return NextResponse.json(
            {
              error: "Service temporarily busy. Please try again.",
              code: "RATE_LIMIT",
            },
            { status: 429 },
          );
        } else {
          return NextResponse.json(
            {
              error: "Unable to cancel subscription. Please try again.",
              code: "STRIPE_ERROR",
            },
            { status: 500 },
          );
        }
      }
    }

    // ONLY update database AFTER Stripe succeeds
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: true },
    });

    return NextResponse.json({
      success: true,
      message: `Your subscription to ${subscription.creator.displayName} will be canceled at the end of your current billing period.`,
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        cancelAtPeriodEnd: updatedSubscription.cancelAtPeriodEnd,
        currentPeriodEnd:
          updatedSubscription.currentPeriodEnd?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("Error canceling subscription:", error);

    // Handle Stripe errors that weren't caught in the inner try/catch
    if (error instanceof Stripe.errors.StripeInvalidRequestError) {
      return NextResponse.json(
        {
          error: "Invalid request. Please contact support.",
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

    return NextResponse.json(
      { error: "Failed to cancel subscription", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}

/**
 * PATCH - Reactivate subscription (set cancelAtPeriodEnd to false)
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id: subscriptionId } = await context.params;

    // Verify authentication
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(
        {
          error: "Please sign in to reactivate subscription",
          code: "UNAUTHORIZED",
        },
        { status: 401 },
      );
    }

    // Rate limit check
    const rateLimitResult = subscriptionRateLimiter.check(clerkId);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many reactivation attempts. Please try again later.",
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

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: {
        id: true,
        userId: true,
        stripeSubscriptionId: true,
        status: true,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: true,
        creator: {
          select: {
            displayName: true,
          },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found", code: "SUBSCRIPTION_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Verify ownership
    if (subscription.userId !== user.id) {
      return NextResponse.json(
        { error: "Subscription not found", code: "SUBSCRIPTION_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Check if subscription is already canceled (past the period end)
    if (subscription.status === "canceled") {
      return NextResponse.json(
        {
          error:
            "This subscription has already ended. Please subscribe again to continue.",
          code: "ALREADY_CANCELED",
        },
        { status: 400 },
      );
    }

    // Check if subscription is not set to cancel
    if (!subscription.cancelAtPeriodEnd) {
      return NextResponse.json(
        {
          error: "This subscription is not scheduled to be canceled.",
          code: "NOT_CANCELING",
        },
        { status: 400 },
      );
    }

    // Reactivate in Stripe FIRST (if we have a Stripe subscription ID)
    // Only update database AFTER Stripe succeeds to ensure consistency
    if (subscription.stripeSubscriptionId) {
      try {
        await reactivateSubscription(subscription.stripeSubscriptionId);
      } catch (stripeError) {
        console.error("Stripe reactivation error:", stripeError);

        // Handle specific Stripe error types
        if (stripeError instanceof Stripe.errors.StripeInvalidRequestError) {
          if (stripeError.code === "resource_missing") {
            // Subscription doesn't exist in Stripe - cannot reactivate
            return NextResponse.json(
              {
                error:
                  "This subscription can no longer be reactivated. Please subscribe again.",
                code: "SUBSCRIPTION_EXPIRED",
              },
              { status: 400 },
            );
          } else {
            return NextResponse.json(
              {
                error: "Invalid reactivation request. Please contact support.",
                code: "INVALID_REQUEST",
              },
              { status: 400 },
            );
          }
        } else if (stripeError instanceof Stripe.errors.StripeRateLimitError) {
          return NextResponse.json(
            {
              error: "Service temporarily busy. Please try again.",
              code: "RATE_LIMIT",
            },
            { status: 429 },
          );
        } else {
          return NextResponse.json(
            {
              error: "Unable to reactivate subscription. Please try again.",
              code: "STRIPE_ERROR",
            },
            { status: 500 },
          );
        }
      }
    }

    // ONLY update database AFTER Stripe succeeds
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: false },
    });

    return NextResponse.json({
      success: true,
      message: `Your subscription to ${subscription.creator.displayName} has been reactivated.`,
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        cancelAtPeriodEnd: updatedSubscription.cancelAtPeriodEnd,
        currentPeriodEnd:
          updatedSubscription.currentPeriodEnd?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("Error reactivating subscription:", error);

    // Handle Stripe errors that weren't caught in the inner try/catch
    if (error instanceof Stripe.errors.StripeInvalidRequestError) {
      return NextResponse.json(
        {
          error: "Invalid request. Please contact support.",
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

    return NextResponse.json(
      { error: "Failed to reactivate subscription", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
