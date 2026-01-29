/**
 * POST /api/admin/content/[id]/action
 *
 * Take moderation action on content.
 * Admin-only access required.
 *
 * Actions:
 * - archive: Archives the content (soft removal)
 * - delete: Soft deletes the content
 * - warn_creator: Sends a warning notification to the creator
 *
 * @see PRD Phase 6, Task 18: Content Moderation
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/middleware/admin-check";
import { moderationActionSchema } from "@/lib/validations/report";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: contentId } = await params;

    // Verify admin access
    const adminCheck = await requireAdmin();
    if (adminCheck.error) {
      return adminCheck.error;
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = moderationActionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid action data",
          code: "VALIDATION_ERROR",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { action, reason, notifyCreator } = validationResult.data;

    // Get content with creator info
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: {
        creator: {
          select: {
            id: true,
            userId: true,
            displayName: true,
            handle: true,
          },
        },
      },
    });

    if (!content) {
      return NextResponse.json(
        { error: "Content not found", code: "CONTENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Perform the action
    let resultMessage = "";

    switch (action) {
      case "archive": {
        await prisma.content.update({
          where: { id: contentId },
          data: {
            status: "archived",
            updatedAt: new Date(),
          },
        });
        resultMessage = "Content has been archived";
        break;
      }

      case "delete": {
        await prisma.content.update({
          where: { id: contentId },
          data: {
            status: "deleted",
            deletedAt: new Date(),
            updatedAt: new Date(),
          },
        });
        resultMessage = "Content has been removed";
        break;
      }

      case "warn_creator": {
        // Just create a notification - no content status change
        resultMessage = "Warning sent to creator";
        break;
      }
    }

    // Send notification to creator if requested
    if (notifyCreator && content.creator.userId) {
      const notificationTitle =
        action === "warn_creator"
          ? "Content Review Notice"
          : action === "archive"
            ? "Content Archived"
            : "Content Removed";

      const notificationBody =
        action === "warn_creator"
          ? `Your content "${content.title}" has been flagged for review. Please ensure your content follows our community guidelines.`
          : action === "archive"
            ? `Your content "${content.title}" has been archived by our moderation team. If you believe this was a mistake, please contact support.`
            : `Your content "${content.title}" has been removed for violating our community guidelines. If you believe this was a mistake, please contact support.`;

      await prisma.notification.create({
        data: {
          userId: content.creator.userId,
          type: "new_content", // Using existing type - could add "moderation" type later
          title: notificationTitle,
          body: notificationBody,
          link: "/creator/content",
        },
      });
    }

    // Update all pending reports for this content to ACTION_TAKEN
    await prisma.contentReport.updateMany({
      where: {
        contentId,
        status: "PENDING",
      },
      data: {
        status: "ACTION_TAKEN",
        reviewedBy: adminCheck.userId,
        reviewedAt: new Date(),
        reviewNotes: `Action taken: ${action}. Reason: ${reason}`,
      },
    });

    return NextResponse.json({
      message: resultMessage,
      action,
      contentId,
      notifiedCreator: notifyCreator,
    });
  } catch (error) {
    console.error("Error taking moderation action:", error);
    return NextResponse.json(
      { error: "Failed to take moderation action", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
