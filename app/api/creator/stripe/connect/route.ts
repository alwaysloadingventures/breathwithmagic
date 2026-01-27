/**
 * POST /api/creator/stripe/connect
 *
 * Create a Stripe Express account for the creator and return an onboarding link.
 * If the creator already has a Stripe account, returns a new onboarding link to resume.
 *
 * Flow:
 * 1. Verify authentication
 * 2. Check if user has a creator profile
 * 3. Create Express account (if not exists) or retrieve existing
 * 4. Generate onboarding link
 * 5. Return link to frontend for redirect
 */
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import {
  createExpressAccount,
  createAccountOnboardingLink,
  retrieveAccount,
  isOnboardingComplete,
} from "@/lib/stripe";

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

    // Get current user's email from Clerk
    const clerkUser = await currentUser();
    if (!clerkUser?.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json(
        { error: "Email address required", code: "EMAIL_REQUIRED" },
        { status: 400 },
      );
    }

    const email = clerkUser.emailAddresses[0].emailAddress;

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
          error: "Creator profile not found. Complete onboarding first.",
          code: "NO_CREATOR_PROFILE",
        },
        { status: 400 },
      );
    }

    const profile = user.creatorProfile;

    // If already has a completed Stripe account, no need to onboard again
    if (profile.stripeAccountId && profile.stripeOnboardingComplete) {
      return NextResponse.json(
        {
          error: "Stripe onboarding already complete",
          code: "ALREADY_COMPLETE",
        },
        { status: 400 },
      );
    }

    let stripeAccountId = profile.stripeAccountId;

    // Create Express account if it doesn't exist
    if (!stripeAccountId) {
      const account = await createExpressAccount(email, {
        creatorProfileId: profile.id,
        creatorHandle: profile.handle,
        userId: user.id,
      });

      stripeAccountId = account.id;

      // Save the Stripe account ID to the creator profile
      await prisma.creatorProfile.update({
        where: { id: profile.id },
        data: { stripeAccountId: account.id },
      });
    } else {
      // Account exists, check if it's already complete
      const account = await retrieveAccount(stripeAccountId);

      if (isOnboardingComplete(account)) {
        // Update local state and return
        await prisma.creatorProfile.update({
          where: { id: profile.id },
          data: {
            stripeOnboardingComplete: true,
            status: "active",
          },
        });

        return NextResponse.json(
          {
            error: "Stripe onboarding already complete",
            code: "ALREADY_COMPLETE",
          },
          { status: 400 },
        );
      }
    }

    // Create onboarding link
    const accountLink = await createAccountOnboardingLink(stripeAccountId);

    return NextResponse.json({
      success: true,
      url: accountLink.url,
      expiresAt: accountLink.expires_at,
    });
  } catch (error) {
    console.error("Error creating Stripe Connect account:", error);

    // Handle specific Stripe errors using typed error classes
    if (error instanceof Stripe.errors.StripeInvalidRequestError) {
      if (error.code === "resource_missing") {
        // Stripe account was deleted or doesn't exist, clear and retry
        return NextResponse.json(
          {
            error: "Stripe account not found. Please try again.",
            code: "STRIPE_ACCOUNT_NOT_FOUND",
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      {
        error: "Failed to create Stripe onboarding link",
        code: "SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}
