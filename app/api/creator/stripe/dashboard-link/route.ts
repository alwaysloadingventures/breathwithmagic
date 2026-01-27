/**
 * POST /api/creator/stripe/dashboard-link
 *
 * Generate a Stripe Express dashboard login link for the creator.
 * This allows creators to access their Stripe dashboard to:
 * - View payouts and balance
 * - Update bank account details
 * - Access tax documents
 * - Manage their Stripe Express account settings
 *
 * Note: Only available for creators with completed Stripe onboarding.
 */
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { createExpressDashboardLink } from "@/lib/stripe";

export async function POST() {
  try {
    // Verify authentication
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // Get user and creator profile
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        creatorProfile: {
          select: {
            id: true,
            stripeAccountId: true,
            stripeOnboardingComplete: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 },
      );
    }

    if (!user.creatorProfile) {
      return NextResponse.json(
        {
          error: "Creator profile not found",
          code: "NO_CREATOR_PROFILE",
        },
        { status: 400 },
      );
    }

    const profile = user.creatorProfile;

    // Check if Stripe account exists
    if (!profile.stripeAccountId) {
      return NextResponse.json(
        {
          error: "Stripe account not set up. Complete onboarding first.",
          code: "NO_STRIPE_ACCOUNT",
        },
        { status: 400 },
      );
    }

    // Check if onboarding is complete
    // Note: Stripe allows dashboard access even during onboarding,
    // but we restrict it to complete accounts for better UX
    if (!profile.stripeOnboardingComplete) {
      return NextResponse.json(
        {
          error: "Please complete Stripe onboarding first",
          code: "ONBOARDING_INCOMPLETE",
        },
        { status: 400 },
      );
    }

    // Create login link
    const loginLink = await createExpressDashboardLink(profile.stripeAccountId);

    return NextResponse.json({
      success: true,
      url: loginLink.url,
      // Login links are single-use and expire after short time
      // Frontend should redirect immediately
    });
  } catch (error) {
    console.error("Error creating Stripe dashboard link:", error);

    // Handle specific Stripe errors using typed error classes
    if (error instanceof Stripe.errors.StripeInvalidRequestError) {
      if (error.code === "resource_missing") {
        return NextResponse.json(
          {
            error: "Stripe account not found. Please contact support.",
            code: "STRIPE_ACCOUNT_NOT_FOUND",
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to create dashboard link", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
