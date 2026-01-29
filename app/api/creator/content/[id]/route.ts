/**
 * /api/creator/content/[id]
 *
 * GET - Get single content item
 * PATCH - Update content
 * DELETE - Soft delete content
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  updateContentSchema,
  canPublishContent,
} from "@/lib/validations/content";
import { sanitizeHtml } from "@/lib/sanitize";
import { sendNewContentEmailsToSubscribers } from "@/lib/email";
import { notifyNewContent } from "@/lib/notifications";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/creator/content/[id]
 *
 * Get a single content item by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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
          select: { id: true },
        },
      },
    });

    if (!user?.creatorProfile) {
      return NextResponse.json(
        { error: "Creator profile not found", code: "NOT_CREATOR" },
        { status: 403 },
      );
    }

    // Fetch content
    const content = await prisma.content.findFirst({
      where: {
        id,
        creatorId: user.creatorProfile.id,
      },
      include: {
        program: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!content) {
      return NextResponse.json(
        { error: "Content not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      content: {
        id: content.id,
        type: content.type,
        title: content.title,
        description: content.description,
        mediaUrl: content.mediaUrl,
        thumbnailUrl: content.thumbnailUrl,
        duration: content.duration,
        isFree: content.isFree,
        status: content.status,
        programId: content.programId,
        program: content.program,
        sortOrder: content.sortOrder,
        publishedAt: content.publishedAt,
        createdAt: content.createdAt,
        updatedAt: content.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching content:", error);
    return NextResponse.json(
      { error: "Failed to fetch content", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/creator/content/[id]
 *
 * Update content metadata
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verify authentication
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // Get user and creator profile (include displayName for notifications)
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        creatorProfile: {
          select: { id: true, displayName: true },
        },
      },
    });

    if (!user?.creatorProfile) {
      return NextResponse.json(
        { error: "Creator profile not found", code: "NOT_CREATOR" },
        { status: 403 },
      );
    }

    // Verify content exists and belongs to this creator
    const existingContent = await prisma.content.findFirst({
      where: {
        id,
        creatorId: user.creatorProfile.id,
      },
    });

    if (!existingContent) {
      return NextResponse.json(
        { error: "Content not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    // Cannot update deleted content
    if (existingContent.status === "deleted") {
      return NextResponse.json(
        { error: "Cannot update deleted content", code: "CONTENT_DELETED" },
        { status: 400 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = updateContentSchema.safeParse(body);

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

    // If trying to publish, validate required fields
    if (data.status === "published" && existingContent.status !== "published") {
      const contentToCheck = {
        type: existingContent.type,
        title: data.title || existingContent.title,
        mediaUrl:
          data.mediaUrl !== undefined
            ? data.mediaUrl
            : existingContent.mediaUrl,
        duration:
          data.duration !== undefined
            ? data.duration
            : existingContent.duration,
      };

      const { canPublish, errors } = canPublishContent(contentToCheck);

      if (!canPublish) {
        return NextResponse.json(
          {
            error: "Cannot publish content",
            code: "PUBLISH_VALIDATION_FAILED",
            details: errors,
          },
          { status: 400 },
        );
      }
    }

    // If programId is provided, verify it belongs to this creator
    if (data.programId) {
      const program = await prisma.program.findFirst({
        where: {
          id: data.programId,
          creatorId: user.creatorProfile.id,
        },
      });

      if (!program) {
        return NextResponse.json(
          { error: "Program not found", code: "PROGRAM_NOT_FOUND" },
          { status: 404 },
        );
      }
    }

    // Prepare update data
    const updateData: Parameters<typeof prisma.content.update>[0]["data"] = {};

    if (data.title !== undefined) updateData.title = data.title;
    // Sanitize description if present (PRD: DOMPurify for user-generated content)
    if (data.description !== undefined)
      updateData.description = data.description
        ? sanitizeHtml(data.description)
        : data.description;
    if (data.mediaUrl !== undefined) updateData.mediaUrl = data.mediaUrl;
    if (data.thumbnailUrl !== undefined)
      updateData.thumbnailUrl = data.thumbnailUrl;
    if (data.duration !== undefined) updateData.duration = data.duration;
    if (data.isFree !== undefined) updateData.isFree = data.isFree;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.programId !== undefined) updateData.programId = data.programId;

    // Handle status changes
    if (data.status !== undefined) {
      updateData.status = data.status;

      // Set publishedAt when publishing for the first time
      if (data.status === "published" && !existingContent.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    // Check if this is a new publish (for notification purposes)
    const isNewPublish =
      data.status === "published" && existingContent.status !== "published";

    // Update content
    const updatedContent = await prisma.content.update({
      where: { id },
      data: updateData,
      include: {
        program: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Send notifications if newly published (fire and forget - don't block response)
    if (isNewPublish) {
      const creatorId = user.creatorProfile.id;
      const creatorName = user.creatorProfile.displayName;
      const contentTitle = updatedContent.title;
      const contentId = updatedContent.id;

      // Send in-app notifications
      notifyNewContent(creatorId, creatorName, contentTitle, contentId).catch(
        (error) =>
          console.error("Error sending new content in-app notifications:", error),
      );

      // Send email notifications
      sendNewContentEmailsToSubscribers(
        creatorId,
        creatorName,
        contentTitle,
        contentId,
      ).catch((error) =>
        console.error("Error sending new content email notifications:", error),
      );
    }

    return NextResponse.json({
      success: true,
      content: {
        id: updatedContent.id,
        type: updatedContent.type,
        title: updatedContent.title,
        description: updatedContent.description,
        mediaUrl: updatedContent.mediaUrl,
        thumbnailUrl: updatedContent.thumbnailUrl,
        duration: updatedContent.duration,
        isFree: updatedContent.isFree,
        status: updatedContent.status,
        programId: updatedContent.programId,
        program: updatedContent.program,
        sortOrder: updatedContent.sortOrder,
        publishedAt: updatedContent.publishedAt,
        createdAt: updatedContent.createdAt,
        updatedAt: updatedContent.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating content:", error);
    return NextResponse.json(
      { error: "Failed to update content", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/creator/content/[id]
 *
 * Soft delete content (set status to 'deleted' and deletedAt timestamp)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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
          select: { id: true },
        },
      },
    });

    if (!user?.creatorProfile) {
      return NextResponse.json(
        { error: "Creator profile not found", code: "NOT_CREATOR" },
        { status: 403 },
      );
    }

    // Verify content exists and belongs to this creator
    const existingContent = await prisma.content.findFirst({
      where: {
        id,
        creatorId: user.creatorProfile.id,
      },
    });

    if (!existingContent) {
      return NextResponse.json(
        { error: "Content not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    // Already deleted
    if (existingContent.status === "deleted") {
      return NextResponse.json(
        { error: "Content already deleted", code: "ALREADY_DELETED" },
        { status: 400 },
      );
    }

    // Soft delete: update status and set deletedAt
    await prisma.content.update({
      where: { id },
      data: {
        status: "deleted",
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Content deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting content:", error);
    return NextResponse.json(
      { error: "Failed to delete content", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
