/**
 * /api/creator/settings
 *
 * GET - Get creator settings
 * PATCH - Update creator settings
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { creatorSettingsUpdateSchema } from "@/lib/validations/analytics";
import { sanitizeHtml } from "@/lib/sanitize";
import { createRateLimiter } from "@/lib/rate-limit";

/**
 * Rate limiter for settings API
 * PRD: 100 requests per minute for general API endpoints
 */
const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
});

/**
 * GET /api/creator/settings
 *
 * Get the current creator's settings
 */
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

    // Check rate limit
    const rateLimitResult = apiRateLimiter.check(clerkId);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" },
        {
          status: 429,
          headers: {
            "Retry-After":
              rateLimitResult.retryAfterSeconds?.toString() || "60",
          },
        },
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
            displayName: true,
            bio: true,
            avatarUrl: true,
            coverImageUrl: true,
            category: true,
            subscriptionPrice: true,
            trialEnabled: true,
            dmEnabled: true,
            stripeAccountId: true,
            stripeOnboardingComplete: true,
            status: true,
            isVerified: true,
            isFeatured: true,
            createdAt: true,
            updatedAt: true,
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
        { error: "Creator profile not found", code: "NOT_CREATOR" },
        { status: 403 },
      );
    }

    return NextResponse.json({
      settings: user.creatorProfile,
    });
  } catch (error) {
    console.error("Error fetching creator settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/creator/settings
 *
 * Update creator settings
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // Check rate limit
    const rateLimitResult = apiRateLimiter.check(clerkId);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" },
        {
          status: 429,
          headers: {
            "Retry-After":
              rateLimitResult.retryAfterSeconds?.toString() || "60",
          },
        },
      );
    }

    // Get user and creator profile
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        creatorProfile: {
          select: { id: true, status: true },
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
        { error: "Creator profile not found", code: "NOT_CREATOR" },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = creatorSettingsUpdateSchema.safeParse(body);

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

    // Prepare update data
    const updateData: Parameters<
      typeof prisma.creatorProfile.update
    >[0]["data"] = {};

    if (data.displayName !== undefined) {
      updateData.displayName = data.displayName;
    }

    // Sanitize bio if present (PRD: DOMPurify for user-generated content)
    if (data.bio !== undefined) {
      updateData.bio = data.bio ? sanitizeHtml(data.bio) : data.bio;
    }

    if (data.avatarUrl !== undefined) {
      updateData.avatarUrl = data.avatarUrl;
    }

    if (data.coverImageUrl !== undefined) {
      updateData.coverImageUrl = data.coverImageUrl;
    }

    if (data.category !== undefined) {
      updateData.category = data.category;
    }

    if (data.subscriptionPrice !== undefined) {
      updateData.subscriptionPrice = data.subscriptionPrice;
    }

    if (data.trialEnabled !== undefined) {
      updateData.trialEnabled = data.trialEnabled;
    }

    if (data.dmEnabled !== undefined) {
      updateData.dmEnabled = data.dmEnabled;
    }

    // Update creator profile
    const updatedProfile = await prisma.creatorProfile.update({
      where: { id: user.creatorProfile.id },
      data: updateData,
      select: {
        id: true,
        handle: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        coverImageUrl: true,
        category: true,
        subscriptionPrice: true,
        trialEnabled: true,
        dmEnabled: true,
        stripeAccountId: true,
        stripeOnboardingComplete: true,
        status: true,
        isVerified: true,
        isFeatured: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      settings: updatedProfile,
    });
  } catch (error) {
    console.error("Error updating creator settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
