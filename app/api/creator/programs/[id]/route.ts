/**
 * /api/creator/programs/[id]
 *
 * GET - Get single program with content
 * PATCH - Update program
 * DELETE - Delete program (removes program association from content)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  updateProgramSchema,
  reorderProgramContentSchema,
} from "@/lib/validations/content";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/creator/programs/[id]
 *
 * Get a single program with its content
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

    // Fetch program with content
    const program = await prisma.program.findFirst({
      where: {
        id,
        creatorId: user.creatorProfile.id,
      },
      include: {
        content: {
          where: {
            status: { not: "deleted" },
          },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            thumbnailUrl: true,
            duration: true,
            isFree: true,
            status: true,
            sortOrder: true,
            publishedAt: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            content: {
              where: { status: { not: "deleted" } },
            },
          },
        },
      },
    });

    if (!program) {
      return NextResponse.json(
        { error: "Program not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      program: {
        id: program.id,
        title: program.title,
        description: program.description,
        thumbnailUrl: program.thumbnailUrl,
        isFree: program.isFree,
        sortOrder: program.sortOrder,
        publishedAt: program.publishedAt,
        createdAt: program.createdAt,
        updatedAt: program.updatedAt,
        contentCount: program._count.content,
        content: program.content,
      },
    });
  } catch (error) {
    console.error("Error fetching program:", error);
    return NextResponse.json(
      { error: "Failed to fetch program", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/creator/programs/[id]
 *
 * Update program metadata or reorder content
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

    // Verify program exists and belongs to this creator
    const existingProgram = await prisma.program.findFirst({
      where: {
        id,
        creatorId: user.creatorProfile.id,
      },
    });

    if (!existingProgram) {
      return NextResponse.json(
        { error: "Program not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const body = await request.json();

    // Check if this is a reorder request
    if (body.contentIds) {
      const reorderResult = reorderProgramContentSchema.safeParse(body);

      if (!reorderResult.success) {
        return NextResponse.json(
          {
            error: reorderResult.error.issues[0].message,
            code: "VALIDATION_ERROR",
            details: reorderResult.error.issues,
          },
          { status: 400 },
        );
      }

      const { contentIds } = reorderResult.data;

      // Verify all content IDs belong to this program and creator
      const content = await prisma.content.findMany({
        where: {
          id: { in: contentIds },
          programId: id,
          creatorId: user.creatorProfile.id,
        },
        select: { id: true },
      });

      if (content.length !== contentIds.length) {
        return NextResponse.json(
          {
            error: "Some content IDs are invalid",
            code: "INVALID_CONTENT_IDS",
          },
          { status: 400 },
        );
      }

      // Update sort order for each content item
      await prisma.$transaction(
        contentIds.map((contentId, index) =>
          prisma.content.update({
            where: { id: contentId },
            data: { sortOrder: index },
          }),
        ),
      );

      return NextResponse.json({
        success: true,
        message: "Content reordered successfully",
      });
    }

    // Otherwise, this is a program update
    const parseResult = updateProgramSchema.safeParse(body);

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
    const updateData: Parameters<typeof prisma.program.update>[0]["data"] = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.thumbnailUrl !== undefined)
      updateData.thumbnailUrl = data.thumbnailUrl;
    if (data.isFree !== undefined) updateData.isFree = data.isFree;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.publishedAt !== undefined)
      updateData.publishedAt = data.publishedAt;

    // Update program
    const updatedProgram = await prisma.program.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            content: {
              where: { status: { not: "deleted" } },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      program: {
        id: updatedProgram.id,
        title: updatedProgram.title,
        description: updatedProgram.description,
        thumbnailUrl: updatedProgram.thumbnailUrl,
        isFree: updatedProgram.isFree,
        sortOrder: updatedProgram.sortOrder,
        publishedAt: updatedProgram.publishedAt,
        createdAt: updatedProgram.createdAt,
        updatedAt: updatedProgram.updatedAt,
        contentCount: updatedProgram._count.content,
      },
    });
  } catch (error) {
    console.error("Error updating program:", error);
    return NextResponse.json(
      { error: "Failed to update program", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/creator/programs/[id]
 *
 * Delete a program (content is preserved, just unlinked from program)
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

    // Verify program exists and belongs to this creator
    const existingProgram = await prisma.program.findFirst({
      where: {
        id,
        creatorId: user.creatorProfile.id,
      },
      include: {
        _count: {
          select: { content: true },
        },
      },
    });

    if (!existingProgram) {
      return NextResponse.json(
        { error: "Program not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    // Delete the program (content will have programId set to null due to onDelete: SetNull)
    await prisma.program.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Program deleted successfully",
      contentUnlinked: existingProgram._count.content,
    });
  } catch (error) {
    console.error("Error deleting program:", error);
    return NextResponse.json(
      { error: "Failed to delete program", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
