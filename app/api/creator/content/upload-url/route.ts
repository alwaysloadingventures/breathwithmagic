/**
 * /api/creator/content/upload-url
 *
 * POST - Generate presigned upload URL for R2 (audio, images)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  audioUploadUrlSchema,
  imageUploadUrlSchema,
} from "@/lib/validations/content";
import {
  generateR2UploadUrl,
  generateUniqueFilename,
  R2_PATHS,
} from "@/lib/cloudflare";
import { uploadRateLimiter } from "@/lib/rate-limit";

/**
 * POST /api/creator/content/upload-url
 *
 * Generate a presigned upload URL for Cloudflare R2
 * Supports audio files and images (thumbnails, avatars, covers)
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

    // Check rate limit (PRD: 10 uploads per hour)
    const { allowed, remaining, retryAfterSeconds } =
      uploadRateLimiter.check(clerkId);
    if (!allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "10",
            "X-RateLimit-Remaining": String(remaining),
            "Retry-After": String(retryAfterSeconds || 3600),
          },
        },
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

    const body = await request.json();
    const uploadType = body.type as "audio" | "image";

    if (uploadType === "audio") {
      // Validate audio upload request
      const parseResult = audioUploadUrlSchema.safeParse(body);

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

      const { contentId, filename, contentType } = parseResult.data;

      // Verify content exists and belongs to this creator
      const content = await prisma.content.findFirst({
        where: {
          id: contentId,
          creatorId: user.creatorProfile.id,
        },
      });

      if (!content) {
        return NextResponse.json(
          { error: "Content not found", code: "NOT_FOUND" },
          { status: 404 },
        );
      }

      // Verify content type is audio
      if (content.type !== "audio") {
        return NextResponse.json(
          {
            error: "Content is not an audio type",
            code: "INVALID_CONTENT_TYPE",
          },
          { status: 400 },
        );
      }

      // Generate unique filename and R2 path
      const uniqueFilename = generateUniqueFilename(filename, "audio");
      const key = R2_PATHS.audio(
        user.creatorProfile.id,
        contentId,
        uniqueFilename,
      );

      // Generate presigned upload URL
      const uploadUrl = await generateR2UploadUrl(key, contentType);

      return NextResponse.json({
        success: true,
        uploadUrl,
        key,
        expiresIn: 3600, // 1 hour
      });
    } else if (uploadType === "image") {
      // Validate image upload request
      const parseResult = imageUploadUrlSchema.safeParse(body);

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

      const { contentId, filename, contentType, purpose } = parseResult.data;

      let key: string;

      if (purpose === "thumbnail" && contentId) {
        // Verify content exists and belongs to this creator
        const content = await prisma.content.findFirst({
          where: {
            id: contentId,
            creatorId: user.creatorProfile.id,
          },
        });

        if (!content) {
          return NextResponse.json(
            { error: "Content not found", code: "NOT_FOUND" },
            { status: 404 },
          );
        }

        const uniqueFilename = generateUniqueFilename(filename, "thumb");
        key = R2_PATHS.thumbnail(
          user.creatorProfile.id,
          contentId,
          uniqueFilename,
        );
      } else if (purpose === "avatar") {
        const uniqueFilename = generateUniqueFilename(filename, "avatar");
        key = R2_PATHS.avatar(user.creatorProfile.id, uniqueFilename);
      } else if (purpose === "cover") {
        const uniqueFilename = generateUniqueFilename(filename, "cover");
        key = R2_PATHS.cover(user.creatorProfile.id, uniqueFilename);
      } else {
        return NextResponse.json(
          { error: "Invalid upload purpose", code: "INVALID_PURPOSE" },
          { status: 400 },
        );
      }

      // Generate presigned upload URL
      const uploadUrl = await generateR2UploadUrl(key, contentType);

      return NextResponse.json({
        success: true,
        uploadUrl,
        key,
        expiresIn: 3600, // 1 hour
      });
    } else {
      return NextResponse.json(
        {
          error: "Invalid upload type. Must be 'audio' or 'image'",
          code: "INVALID_TYPE",
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error generating upload URL:", error);

    // Check for missing environment variables
    if (
      error instanceof Error &&
      error.message.includes("Missing required environment variable")
    ) {
      return NextResponse.json(
        {
          error: "Upload service not configured",
          code: "SERVICE_NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Failed to generate upload URL", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
