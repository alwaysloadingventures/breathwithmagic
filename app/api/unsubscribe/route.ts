/**
 * /api/unsubscribe
 *
 * POST - Update email preferences using a secure token
 *
 * This endpoint allows users to update their email preferences
 * without being logged in, using a secure token from email links.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/email-tokens";
import { z } from "zod/v4";

/**
 * Validation schema for unsubscribe request
 */
const unsubscribeSchema = z.object({
  token: z.string().min(1, "Token is required"),
  preferences: z.object({
    newContent: z.boolean().optional(),
    newMessage: z.boolean().optional(),
    trialReminders: z.boolean().optional(),
    paymentAlerts: z.boolean().optional(),
    subscriptionUpdates: z.boolean().optional(),
    marketing: z.boolean().optional(),
  }),
});

/**
 * POST /api/unsubscribe
 *
 * Update email preferences using a secure token
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const parseResult = unsubscribeSchema.safeParse(body);

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

    const { token, preferences } = parseResult.data;

    // Verify token and extract userId
    const userId = verifyUnsubscribeToken(token);

    if (!userId) {
      return NextResponse.json(
        {
          error: "Invalid or expired token. Please use a more recent email link.",
          code: "INVALID_TOKEN",
        },
        { status: 401 },
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Build update data (only include fields that are provided)
    const updateData: Record<string, boolean> = {};
    if (preferences.newContent !== undefined) {
      updateData.newContent = preferences.newContent;
    }
    if (preferences.newMessage !== undefined) {
      updateData.newMessage = preferences.newMessage;
    }
    if (preferences.trialReminders !== undefined) {
      updateData.trialReminders = preferences.trialReminders;
    }
    if (preferences.paymentAlerts !== undefined) {
      updateData.paymentAlerts = preferences.paymentAlerts;
    }
    if (preferences.subscriptionUpdates !== undefined) {
      updateData.subscriptionUpdates = preferences.subscriptionUpdates;
    }
    if (preferences.marketing !== undefined) {
      updateData.marketing = preferences.marketing;
    }

    // Upsert email preferences
    const updatedPreferences = await prisma.emailPreferences.upsert({
      where: { userId },
      create: {
        userId,
        ...updateData,
      },
      update: updateData,
    });

    // Log the unsubscribe action
    console.log(
      `Email preferences updated via unsubscribe link for user ${userId}:`,
      updateData,
    );

    return NextResponse.json({
      success: true,
      preferences: {
        newContent: updatedPreferences.newContent,
        newMessage: updatedPreferences.newMessage,
        trialReminders: updatedPreferences.trialReminders,
        paymentAlerts: updatedPreferences.paymentAlerts,
        subscriptionUpdates: updatedPreferences.subscriptionUpdates,
        marketing: updatedPreferences.marketing,
      },
    });
  } catch (error) {
    console.error("Error processing unsubscribe request:", error);
    return NextResponse.json(
      { error: "Failed to update email preferences", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
