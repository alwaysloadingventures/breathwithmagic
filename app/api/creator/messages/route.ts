/**
 * /api/creator/messages
 *
 * GET - Fetch sent broadcast messages for the current creator
 *
 * PRD Requirements:
 * - Shows sent broadcasts with timestamp
 * - Cursor-based pagination
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { creatorMessagesQuerySchema } from "@/lib/validations/message";

/**
 * GET /api/creator/messages
 *
 * Fetch sent broadcast messages for the creator
 * Groups by unique broadcast (same content + createdAt within 1 minute)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // Get user and verify they are a creator
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        creatorProfile: {
          select: {
            id: true,
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
        { error: "Creator profile not found", code: "NOT_CREATOR" },
        { status: 403 },
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryResult = creatorMessagesQuerySchema.safeParse({
      cursor: searchParams.get("cursor") || undefined,
      limit: searchParams.get("limit") || 20,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          code: "VALIDATION_ERROR",
          details: queryResult.error.issues,
        },
        { status: 400 },
      );
    }

    const { cursor, limit } = queryResult.data;

    // Fetch broadcast messages sent by this creator
    // We'll get distinct broadcasts by grouping messages with same content and similar timestamp
    const messages = await prisma.message.findMany({
      where: {
        senderId: user.id,
        isBroadcast: true,
      },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: "desc" },
      distinct: ["content", "createdAt"],
    });

    // For each unique broadcast, get the recipient count
    const broadcastsWithCounts = await Promise.all(
      messages.slice(0, limit).map(async (message) => {
        // Find all messages with the same content sent at the same time (within 10 seconds)
        // This groups the broadcast
        const recipientCount = await prisma.message.count({
          where: {
            senderId: user.id,
            isBroadcast: true,
            content: message.content,
            createdAt: {
              gte: new Date(message.createdAt.getTime() - 10000),
              lte: new Date(message.createdAt.getTime() + 10000),
            },
          },
        });

        return {
          id: message.id,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
          recipientCount,
        };
      }),
    );

    // De-duplicate broadcasts that might have the same content
    // by using a Map keyed by content + minute timestamp
    const uniqueBroadcasts = new Map<
      string,
      (typeof broadcastsWithCounts)[0]
    >();
    for (const broadcast of broadcastsWithCounts) {
      const timestamp = new Date(broadcast.createdAt);
      const key = `${broadcast.content}-${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}-${timestamp.getHours()}-${timestamp.getMinutes()}`;
      if (!uniqueBroadcasts.has(key)) {
        uniqueBroadcasts.set(key, broadcast);
      }
    }

    const items = Array.from(uniqueBroadcasts.values());

    // Determine pagination
    const hasNextPage = messages.length > limit;
    const nextCursor = hasNextPage ? messages[limit - 1]?.id : null;

    return NextResponse.json({
      items,
      nextCursor,
    });
  } catch (error) {
    console.error("Error fetching creator messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
