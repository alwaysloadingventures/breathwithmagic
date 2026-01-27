/**
 * POST /api/creator/activate
 *
 * Activate a creator profile after onboarding is complete
 * Updates the user role to 'creator' and sets profile status
 *
 * Note: In the full flow, this would only succeed after Stripe Connect
 * is complete. For now, we set status to 'pending_setup' and update
 * user role to 'creator'.
 */
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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

    // Get user with creator profile
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { creatorProfile: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Check if creator profile exists
    if (!user.creatorProfile) {
      return NextResponse.json(
        {
          error: "Please complete onboarding first",
          code: "NO_CREATOR_PROFILE",
        },
        { status: 400 },
      );
    }

    // Validate that required fields are set
    const profile = user.creatorProfile;
    if (!profile.handle || !profile.displayName || !profile.category) {
      return NextResponse.json(
        {
          error: "Please complete all required profile fields",
          code: "INCOMPLETE_PROFILE",
        },
        { status: 400 },
      );
    }

    // If already active, return success
    if (profile.status === "active" && user.role === "creator") {
      return NextResponse.json({
        success: true,
        message: "Your creator profile is already active",
        creatorProfile: {
          id: profile.id,
          handle: profile.handle,
          displayName: profile.displayName,
          status: profile.status,
        },
      });
    }

    // Update user role to creator and set profile status
    // Note: Status remains 'pending_setup' until Stripe Connect is complete
    const [updatedUser, updatedProfile] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { role: "creator" },
      }),
      prisma.creatorProfile.update({
        where: { id: profile.id },
        data: {
          // Status remains pending_setup until Stripe is connected
          // Once Stripe onboarding is complete (Task 2.2), this will be set to 'active'
          status: "pending_setup",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message:
        "Your creator profile has been created. Complete Stripe setup to start accepting payments.",
      creatorProfile: {
        id: updatedProfile.id,
        handle: updatedProfile.handle,
        displayName: updatedProfile.displayName,
        status: updatedProfile.status,
        stripeOnboardingComplete: updatedProfile.stripeOnboardingComplete,
      },
      userRole: updatedUser.role,
      nextStep: "stripe_connect", // Indicates next step in onboarding
    });
  } catch (error) {
    console.error("Error activating creator profile:", error);
    return NextResponse.json(
      { error: "Failed to activate creator profile", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
