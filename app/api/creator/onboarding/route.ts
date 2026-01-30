/**
 * POST /api/creator/onboarding
 *
 * Save creator onboarding progress
 * Creates or updates a partial CreatorProfile in pending_setup status
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensure-user";
import { creatorOnboardingSchema } from "@/lib/validations/creator";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication and ensure user exists in database
    const userResult = await ensureUser();
    if (!userResult) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // Get user with creator profile
    const user = await prisma.user.findUnique({
      where: { id: userResult.user.id },
      include: { creatorProfile: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 },
      );
    }

    // If user already has an active creator profile, don't allow re-onboarding
    if (user.creatorProfile?.status === "active") {
      return NextResponse.json(
        {
          error: "You already have an active creator profile",
          code: "ALREADY_CREATOR",
        },
        { status: 400 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = creatorOnboardingSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: parseResult.error.issues[0].message,
          code: "VALIDATION_ERROR",
          details: parseResult.error.issues,
        },
        { status: 400 },
      );
    }

    const data = parseResult.data;

    // Check if handle is still available (race condition protection)
    const existingHandle = await prisma.creatorProfile.findUnique({
      where: { handle: data.handle },
      select: { id: true, userId: true },
    });

    // If handle exists and belongs to a different user, reject
    if (existingHandle && existingHandle.userId !== user.id) {
      return NextResponse.json(
        {
          error: "This handle is no longer available",
          code: "HANDLE_TAKEN",
        },
        { status: 409 },
      );
    }

    // Create or update the creator profile
    const creatorProfile = await prisma.creatorProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        handle: data.handle,
        displayName: data.displayName,
        bio: data.bio || null,
        avatarUrl: data.avatarUrl || null,
        category: data.category,
        subscriptionPrice: data.subscriptionPrice,
        trialEnabled: data.trialEnabled,
        status: "pending_setup", // Will become active after Stripe Connect
        stripeOnboardingComplete: false,
      },
      update: {
        handle: data.handle,
        displayName: data.displayName,
        bio: data.bio || null,
        avatarUrl: data.avatarUrl || null,
        category: data.category,
        subscriptionPrice: data.subscriptionPrice,
        trialEnabled: data.trialEnabled,
        // Keep status as pending_setup until Stripe is complete
      },
    });

    return NextResponse.json({
      success: true,
      creatorProfile: {
        id: creatorProfile.id,
        handle: creatorProfile.handle,
        displayName: creatorProfile.displayName,
        category: creatorProfile.category,
        subscriptionPrice: creatorProfile.subscriptionPrice,
        trialEnabled: creatorProfile.trialEnabled,
        status: creatorProfile.status,
      },
    });
  } catch (error) {
    console.error("Error saving onboarding progress:", error);

    // Handle unique constraint violations
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "This handle is already taken", code: "HANDLE_TAKEN" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to save onboarding progress", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/creator/onboarding
 *
 * Get current creator onboarding status and data
 */
export async function GET() {
  try {
    // Verify authentication and ensure user exists in database
    const userResult = await ensureUser();
    if (!userResult) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userResult.user.id },
      include: {
        creatorProfile: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            bio: true,
            avatarUrl: true,
            category: true,
            subscriptionPrice: true,
            trialEnabled: true,
            status: true,
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

    return NextResponse.json({
      hasCreatorProfile: !!user.creatorProfile,
      creatorProfile: user.creatorProfile,
      userRole: user.role,
    });
  } catch (error) {
    console.error("Error fetching onboarding status:", error);
    return NextResponse.json(
      { error: "Failed to fetch onboarding status", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
