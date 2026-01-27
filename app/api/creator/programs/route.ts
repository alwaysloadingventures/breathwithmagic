/**
 * /api/creator/programs
 *
 * POST - Create new program
 * GET - List creator's programs with pagination
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  createProgramSchema,
  programListQuerySchema,
} from "@/lib/validations/content";

/**
 * POST /api/creator/programs
 *
 * Create a new program/series
 */
export async function POST(request: NextRequest) {
  try {
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
    const parseResult = createProgramSchema.safeParse(body);

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

    // Create the program
    const program = await prisma.program.create({
      data: {
        creatorId: user.creatorProfile.id,
        title: data.title,
        description: data.description || null,
        thumbnailUrl: data.thumbnailUrl || null,
        isFree: data.isFree,
        sortOrder: data.sortOrder,
      },
    });

    return NextResponse.json({
      success: true,
      program: {
        id: program.id,
        title: program.title,
        description: program.description,
        thumbnailUrl: program.thumbnailUrl,
        isFree: program.isFree,
        sortOrder: program.sortOrder,
        publishedAt: program.publishedAt,
        createdAt: program.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating program:", error);
    return NextResponse.json(
      { error: "Failed to create program", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/creator/programs
 *
 * List creator's programs with cursor-based pagination
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryResult = programListQuerySchema.safeParse({
      cursor: searchParams.get("cursor") || undefined,
      limit: searchParams.get("limit") || 20,
      includeContent: searchParams.get("includeContent") || false,
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

    const { cursor, limit, includeContent } = queryResult.data;

    // Build include clause based on whether we want content
    const includeClause = includeContent
      ? {
          content: {
            where: {
              status: { not: "deleted" as const },
            },
            orderBy: { sortOrder: "asc" as const },
            select: {
              id: true,
              type: true,
              title: true,
              thumbnailUrl: true,
              duration: true,
              isFree: true,
              status: true,
              sortOrder: true,
            },
          },
          _count: {
            select: {
              content: {
                where: { status: { not: "deleted" as const } },
              },
            },
          },
        }
      : {
          _count: {
            select: {
              content: {
                where: { status: { not: "deleted" as const } },
              },
            },
          },
        };

    // Fetch programs with cursor-based pagination
    const programs = await prisma.program.findMany({
      where: {
        creatorId: user.creatorProfile.id,
      },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: includeClause,
    });

    // Determine if there's a next page
    const hasNextPage = programs.length > limit;
    const items = hasNextPage ? programs.slice(0, limit) : programs;
    const nextCursor = hasNextPage ? items[items.length - 1]?.id : null;

    return NextResponse.json({
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        thumbnailUrl: item.thumbnailUrl,
        isFree: item.isFree,
        sortOrder: item.sortOrder,
        publishedAt: item.publishedAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        contentCount: item._count.content,
        ...(includeContent && "content" in item
          ? { content: item.content }
          : {}),
      })),
      nextCursor,
    });
  } catch (error) {
    console.error("Error listing programs:", error);
    return NextResponse.json(
      { error: "Failed to list programs", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
