/**
 * POST /api/subscriptions/billing-portal
 *
 * Create a Stripe billing portal session for the authenticated user.
 * The billing portal allows users to:
 * - View payment history
 * - Update payment methods
 * - Download invoices
 * - Manage subscriptions
 *
 * Request Body (optional):
 * - returnUrl: URL to redirect to after portal session (defaults to /subscriptions)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { createBillingPortalSession, getBaseUrl } from "@/lib/stripe";
import { billingPortalSchema } from "@/lib/validations/subscription";
import { subscriptionRateLimiter } from "@/lib/rate-limit";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(
        { error: "Please sign in to access billing", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // Rate limit check
    const rateLimitResult = subscriptionRateLimiter.check(clerkId);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
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

    // Get user with Stripe customer ID
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        id: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 },
      );
    }

    if (!user.stripeCustomerId) {
      return NextResponse.json(
        {
          error:
            "No billing account found. You need an active subscription to access billing.",
          code: "NO_BILLING_ACCOUNT",
        },
        { status: 400 },
      );
    }

    // Parse request body for optional returnUrl
    let returnUrl: string;
    const baseUrl = getBaseUrl();

    try {
      const body = await request.json().catch(() => ({}));
      const parseResult = billingPortalSchema.safeParse(body);

      if (parseResult.success && parseResult.data.returnUrl) {
        // Validate returnUrl is from our domain for security
        const providedUrl = new URL(parseResult.data.returnUrl);
        const baseUrlParsed = new URL(baseUrl);

        if (providedUrl.host === baseUrlParsed.host) {
          returnUrl = parseResult.data.returnUrl;
        } else {
          // External URL not allowed, use default
          returnUrl = `${baseUrl}/subscriptions`;
        }
      } else {
        returnUrl = `${baseUrl}/subscriptions`;
      }
    } catch {
      returnUrl = `${baseUrl}/subscriptions`;
    }

    // Create billing portal session
    const session = await createBillingPortalSession(
      user.stripeCustomerId,
      returnUrl,
    );

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error("Error creating billing portal session:", error);

    // Handle specific Stripe error types
    if (error instanceof Stripe.errors.StripeInvalidRequestError) {
      if (error.code === "resource_missing") {
        return NextResponse.json(
          {
            error: "Billing account not found. Please contact support.",
            code: "RESOURCE_NOT_FOUND",
          },
          { status: 400 },
        );
      }
      if (error.message.includes("portal configuration")) {
        return NextResponse.json(
          {
            error: "Billing portal is not available. Please contact support.",
            code: "PORTAL_NOT_CONFIGURED",
          },
          { status: 500 },
        );
      }
      return NextResponse.json(
        {
          error: "Invalid billing request. Please contact support.",
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

    if (error instanceof Stripe.errors.StripeAPIError) {
      return NextResponse.json(
        {
          error: "Billing service error. Please try again later.",
          code: "STRIPE_API_ERROR",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        error: "Unable to access billing portal. Please try again later.",
        code: "SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}
