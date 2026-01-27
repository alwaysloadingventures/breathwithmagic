/**
 * /api/creator/content/video-upload
 *
 * POST - Generate Cloudflare Stream direct upload URL
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { videoUploadUrlSchema } from "@/lib/validations/content";
import { createStreamUploadUrl } from "@/lib/cloudflare";
import { uploadRateLimiter } from "@/lib/rate-limit";

/**
 * POST /api/creator/content/video-upload
 *
 * Generate a direct upload URL for Cloudflare Stream
 * The creator can upload directly to Cloudflare Stream using TUS protocol
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
          select: { id: true, handle: true },
        },
      },
    });

    if (!user?.creatorProfile) {
      return NextResponse.json(
        { error: "Creator profile not found", code: "NOT_CREATOR" },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = videoUploadUrlSchema.safeParse(body);

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

    const { contentId, maxDurationSeconds } = parseResult.data;

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

    // Verify content type is video
    if (content.type !== "video") {
      return NextResponse.json(
        { error: "Content is not a video type", code: "INVALID_CONTENT_TYPE" },
        { status: 400 },
      );
    }

    // Create Cloudflare Stream upload URL with metadata
    const { uploadUrl, videoUid } = await createStreamUploadUrl(
      {
        contentId,
        creatorId: user.creatorProfile.id,
        creatorHandle: user.creatorProfile.handle,
        title: content.title,
      },
      maxDurationSeconds,
    );

    // Update content with the video UID (preliminary - will be confirmed after upload)
    await prisma.content.update({
      where: { id: contentId },
      data: {
        mediaUrl: videoUid, // Store the Cloudflare Stream UID
      },
    });

    return NextResponse.json({
      success: true,
      uploadUrl,
      videoUid,
      maxDurationSeconds,
      // Include TUS protocol info for client
      tusProtocol: true,
      expiresIn: 21600, // 6 hours (default upload window)
    });
  } catch (error) {
    console.error("Error generating video upload URL:", error);

    // Check for missing environment variables
    if (
      error instanceof Error &&
      error.message.includes("Missing required environment variable")
    ) {
      return NextResponse.json(
        {
          error: "Video upload service not configured",
          code: "SERVICE_NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }

    // Check for Cloudflare API errors
    if (error instanceof Error && error.message.includes("Cloudflare")) {
      return NextResponse.json(
        {
          error: "Video upload service temporarily unavailable",
          code: "SERVICE_UNAVAILABLE",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Failed to generate video upload URL", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
