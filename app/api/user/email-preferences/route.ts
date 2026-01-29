/**
 * /api/user/email-preferences
 *
 * GET - Get current email preferences
 * PATCH - Update email preferences
 *
 * PRD Requirements:
 * - Users can opt-in/opt-out of each email type
 * - Preferences stored in database
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";
import { apiRateLimiter } from "@/lib/rate-limit";

/**
 * Validation schema for updating email preferences
 */
const updatePreferencesSchema = z.object({
  newContent: z.boolean().optional(),
  newMessage: z.boolean().optional(),
  trialReminders: z.boolean().optional(),
  paymentAlerts: z.boolean().optional(),
  subscriptionUpdates: z.boolean().optional(),
  marketing: z.boolean().optional(),
});

/**
 * GET /api/user/email-preferences
 *
 * Get the current user's email preferences
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

    // Rate limiting
    const { allowed, remaining, retryAfterSeconds } =
      await apiRateLimiter.checkAsync(clerkId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", code: "RATE_LIMIT_EXCEEDED" },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSeconds || 60),
            "X-RateLimit-Limit": "100",
            "X-RateLimit-Remaining": String(remaining),
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

    // Get or create email preferences
    let preferences = await prisma.emailPreferences.findUnique({
      where: { userId: user.id },
    });

    // If no preferences exist, create default ones
    if (!preferences) {
      preferences = await prisma.emailPreferences.create({
        data: { userId: user.id },
      });
    }

    return NextResponse.json({
      preferences: {
        newContent: preferences.newContent,
        newMessage: preferences.newMessage,
        trialReminders: preferences.trialReminders,
        paymentAlerts: preferences.paymentAlerts,
        subscriptionUpdates: preferences.subscriptionUpdates,
        marketing: preferences.marketing,
      },
    });
  } catch (error) {
    console.error("Error fetching email preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch email preferences", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/user/email-preferences
 *
 * Update the current user's email preferences
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

    // Rate limiting
    const { allowed, remaining, retryAfterSeconds } =
      await apiRateLimiter.checkAsync(clerkId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", code: "RATE_LIMIT_EXCEEDED" },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSeconds || 60),
            "X-RateLimit-Limit": "100",
            "X-RateLimit-Remaining": String(remaining),
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

    // Parse and validate request body
    const body = await request.json();
    const parseResult = updatePreferencesSchema.safeParse(body);

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

    // Check if at least one preference is being updated
    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No preferences to update", code: "NO_UPDATES" },
        { status: 400 },
      );
    }

    // Upsert email preferences
    const preferences = await prisma.emailPreferences.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        ...data,
      },
      update: data,
    });

    return NextResponse.json({
      success: true,
      preferences: {
        newContent: preferences.newContent,
        newMessage: preferences.newMessage,
        trialReminders: preferences.trialReminders,
        paymentAlerts: preferences.paymentAlerts,
        subscriptionUpdates: preferences.subscriptionUpdates,
        marketing: preferences.marketing,
      },
    });
  } catch (error) {
    console.error("Error updating email preferences:", error);
    return NextResponse.json(
      { error: "Failed to update email preferences", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
