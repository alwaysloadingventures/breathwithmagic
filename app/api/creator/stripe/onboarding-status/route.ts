/**
 * GET /api/creator/stripe/onboarding-status
 *
 * Check the current status of Stripe Express onboarding for the creator.
 * Returns detailed information about what's missing or if complete.
 *
 * Used by:
 * - Return page to verify completion after redirect
 * - Dashboard to show appropriate banner
 * - Refresh page to check if user needs to continue
 */
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { retrieveAccount, isOnboardingComplete } from "@/lib/stripe";

export async function GET() {
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
            handle: true,
            stripeAccountId: true,
            stripeOnboardingComplete: true,
            status: true,
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

    // If no Stripe account created yet
    if (!profile.stripeAccountId) {
      return NextResponse.json({
        hasStripeAccount: false,
        isComplete: false,
        status: "not_started",
        message: "Stripe account not yet created",
      });
    }

    // Check with Stripe for latest status
    try {
      const account = await retrieveAccount(profile.stripeAccountId);
      const complete = isOnboardingComplete(account);

      // If complete but local state says otherwise, update it
      if (complete && !profile.stripeOnboardingComplete) {
        await prisma.creatorProfile.update({
          where: { id: profile.id },
          data: {
            stripeOnboardingComplete: true,
            status: "active",
          },
        });
      }

      // Determine detailed status
      let status: string;
      let message: string;

      if (complete) {
        status = "complete";
        message = "Stripe onboarding complete. You can now accept payments.";
      } else if (account.details_submitted && !account.charges_enabled) {
        status = "pending_verification";
        message =
          "Your information has been submitted. Stripe is verifying your account.";
      } else if (!account.details_submitted) {
        status = "incomplete";
        message = "Please complete your Stripe account setup.";
      } else {
        status = "in_progress";
        message = "Stripe onboarding in progress.";
      }

      return NextResponse.json({
        hasStripeAccount: true,
        isComplete: complete,
        status,
        message,
        details: {
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          // Include any requirements that need attention
          currentlyDue: account.requirements?.currently_due ?? [],
          eventuallyDue: account.requirements?.eventually_due ?? [],
          pendingVerification: account.requirements?.pending_verification ?? [],
        },
      });
    } catch (stripeError) {
      console.error("Error retrieving Stripe account:", stripeError);

      // If account doesn't exist in Stripe, clear local reference
      // Use Stripe's typed error classes for proper error handling
      if (stripeError instanceof Stripe.errors.StripeInvalidRequestError) {
        if (stripeError.code === "resource_missing") {
          await prisma.creatorProfile.update({
            where: { id: profile.id },
            data: {
              stripeAccountId: null,
              stripeOnboardingComplete: false,
            },
          });

          return NextResponse.json({
            hasStripeAccount: false,
            isComplete: false,
            status: "not_started",
            message: "Stripe account not found. Please start setup again.",
          });
        }
      }

      throw stripeError;
    }
  } catch (error) {
    console.error("Error checking Stripe onboarding status:", error);
    return NextResponse.json(
      { error: "Failed to check onboarding status", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
