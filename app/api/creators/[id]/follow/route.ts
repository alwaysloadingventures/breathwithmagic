import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

/**
 * Follow API Routes
 *
 * POST /api/creators/[id]/follow - Follow a creator
 * DELETE /api/creators/[id]/follow - Unfollow a creator
 *
 * Requires authentication.
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Please sign in to follow creators", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const { id } = await params;

    // Find the user in database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Find the creator
    const creator = await prisma.creatorProfile.findFirst({
      where: {
        OR: [{ id }, { handle: id }],
        status: "active",
      },
      select: { id: true, displayName: true },
    });

    if (!creator) {
      return NextResponse.json(
        { error: "Creator not found", code: "CREATOR_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        userId_creatorId: {
          userId: user.id,
          creatorId: creator.id,
        },
      },
    });

    if (existingFollow) {
      return NextResponse.json(
        { error: "Already following this creator", code: "ALREADY_FOLLOWING" },
        { status: 409 },
      );
    }

    // Create follow
    await prisma.follow.create({
      data: {
        userId: user.id,
        creatorId: creator.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `You are now following ${creator.displayName}`,
    });
  } catch (error) {
    console.error("Follow error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again.", code: "FOLLOW_ERROR" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Please sign in to unfollow creators", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const { id } = await params;

    // Find the user in database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Find the creator
    const creator = await prisma.creatorProfile.findFirst({
      where: {
        OR: [{ id }, { handle: id }],
        status: "active",
      },
      select: { id: true, displayName: true },
    });

    if (!creator) {
      return NextResponse.json(
        { error: "Creator not found", code: "CREATOR_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Delete follow
    const result = await prisma.follow.deleteMany({
      where: {
        userId: user.id,
        creatorId: creator.id,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "You are not following this creator", code: "NOT_FOLLOWING" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `You have unfollowed ${creator.displayName}`,
    });
  } catch (error) {
    console.error("Unfollow error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again.", code: "UNFOLLOW_ERROR" },
      { status: 500 },
    );
  }
}
