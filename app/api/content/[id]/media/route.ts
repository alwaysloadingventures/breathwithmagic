/**
 * GET /api/content/[id]/media
 *
 * Returns signed media URLs for authorized content access.
 * This endpoint validates subscription status before generating URLs.
 *
 * Security:
 * - Requires authentication for paid content
 * - Validates subscription status with Redis caching
 * - Returns signed URLs bound to the user
 * - Logs all access attempts for audit trail
 *
 * Response:
 * - 200: { mediaUrl, expiresAt, type } - Signed URL for authorized access
 * - 401: Unauthenticated (for paid content)
 * - 403: Not subscribed (no access)
 * - 404: Content not found
 * - 429: Rate limited
 *
 * @see PRD Phase 3, Task 12: Paywall Enforcement
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { apiRateLimiter } from "@/lib/rate-limit";
import { checkContentAccess } from "@/lib/middleware/subscription-check";
import {
  generateSignedR2Url,
  generateSignedStreamToken,
  logMediaAccess,
  DEFAULT_URL_EXPIRATION,
} from "@/lib/media/signed-urls";

// Price display mapping
const PRICE_DISPLAY: Record<string, { amount: string; cents: number }> = {
  TIER_FREE: { amount: "Free", cents: 0 },
  TIER_500: { amount: "$5", cents: 500 },
  TIER_1000: { amount: "$10", cents: 1000 },
  TIER_1500: { amount: "$15", cents: 1500 },
  TIER_2000: { amount: "$20", cents: 2000 },
  TIER_2500: { amount: "$25", cents: 2500 },
  TIER_3000: { amount: "$30", cents: 3000 },
  TIER_4000: { amount: "$40", cents: 4000 },
  TIER_5000: { amount: "$50", cents: 5000 },
  TIER_7500: { amount: "$75", cents: 7500 },
  TIER_9900: { amount: "$99", cents: 9900 },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const { id: contentId } = await params;

    // Get user authentication
    const { userId: clerkId } = await auth();

    // Rate limit check
    const rateLimitKey =
      clerkId || request.headers.get("x-forwarded-for") || "anonymous";
    const rateLimitResult = apiRateLimiter.check(rateLimitKey);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          code: "RATE_LIMITED",
          retryAfter: rateLimitResult.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfterSeconds),
          },
        },
      );
    }

    // Fetch content with creator info
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: {
        creator: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatarUrl: true,
            subscriptionPrice: true,
            trialEnabled: true,
            status: true,
            userId: true,
          },
        },
      },
    });

    if (!content) {
      return NextResponse.json(
        { error: "Content not found", code: "CONTENT_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Check if content is published and creator is active
    if (content.status !== "published" || content.creator.status !== "active") {
      return NextResponse.json(
        { error: "Content not available", code: "CONTENT_UNAVAILABLE" },
        { status: 404 },
      );
    }

    // Check if content has media
    if (!content.mediaUrl) {
      return NextResponse.json(
        { error: "No media available for this content", code: "NO_MEDIA" },
        { status: 404 },
      );
    }

    // Get internal user ID if authenticated
    let userId: string | undefined;
    if (clerkId) {
      const user = await prisma.user.findUnique({
        where: { clerkId },
        select: { id: true },
      });
      userId = user?.id;
    }

    // Check content access
    const accessResult = await checkContentAccess({
      contentId,
      userId,
      content: {
        id: content.id,
        isFree: content.isFree,
        creatorId: content.creatorId,
        status: content.status,
      },
    });

    // If no access, return 403 with paywall info
    if (!accessResult.hasAccess) {
      // Log denied access
      logMediaAccess({
        action: "access_denied",
        userId: userId || "anonymous",
        contentId,
        creatorId: content.creatorId,
        mediaType: content.type as "video" | "audio",
        reason: accessResult.reason,
      });

      const price = PRICE_DISPLAY[content.creator.subscriptionPrice];

      return NextResponse.json(
        {
          error: "Subscription required to access this content",
          code: "SUBSCRIPTION_REQUIRED",
          reason: accessResult.reason,
          creator: {
            id: content.creator.id,
            handle: content.creator.handle,
            displayName: content.creator.displayName,
            avatarUrl: content.creator.avatarUrl,
            subscriptionPrice: price,
            trialEnabled: content.creator.trialEnabled,
          },
        },
        { status: 403 },
      );
    }

    // User has access - generate signed URL based on content type
    const signedUrlOptions = {
      userId: userId || "anonymous",
      contentId,
      creatorId: content.creatorId,
      expiresIn: DEFAULT_URL_EXPIRATION,
    };

    let mediaResponse: {
      url: string;
      expiresAt: number;
      type: string;
      playbackUrl?: string;
    };

    if (content.type === "video") {
      // For video, we need to generate a Cloudflare Stream signed token
      // The mediaUrl should be the Stream video UID
      const videoUid = extractVideoUid(content.mediaUrl);

      if (!videoUid) {
        console.error("Invalid video URL format:", content.mediaUrl);
        return NextResponse.json(
          { error: "Invalid video configuration", code: "INVALID_MEDIA" },
          { status: 500 },
        );
      }

      const signedToken = await generateSignedStreamToken(
        videoUid,
        signedUrlOptions,
      );

      mediaResponse = {
        url: signedToken.playbackUrl,
        expiresAt: signedToken.expiresAt,
        type: "video",
        playbackUrl: signedToken.playbackUrl,
      };
    } else {
      // For audio and images, generate a signed R2 URL
      const r2Key = extractR2Key(content.mediaUrl);

      if (!r2Key) {
        console.error("Invalid R2 URL format:", content.mediaUrl);
        return NextResponse.json(
          { error: "Invalid media configuration", code: "INVALID_MEDIA" },
          { status: 500 },
        );
      }

      const signedUrl = await generateSignedR2Url(r2Key, signedUrlOptions);

      mediaResponse = {
        url: signedUrl.url,
        expiresAt: signedUrl.expiresAt,
        type: content.type,
      };
    }

    // Calculate processing time for monitoring
    const processingTime = Date.now() - startTime;

    return NextResponse.json(
      {
        ...mediaResponse,
        contentId,
        duration: content.duration,
        title: content.title,
        thumbnailUrl: content.thumbnailUrl,
        // Include next revalidation time for clients
        revalidateIn: Math.min(
          300,
          mediaResponse.expiresAt - Math.floor(Date.now() / 1000) - 60,
        ),
      },
      {
        headers: {
          // Cache control: don't cache signed URLs
          "Cache-Control": "no-store, no-cache, must-revalidate",
          // Include expiration for client-side handling
          "X-Expires-At": String(mediaResponse.expiresAt),
          // Processing time for monitoring
          "X-Processing-Time": `${processingTime}ms`,
        },
      },
    );
  } catch (error) {
    console.error("Error generating media URL:", error);
    return NextResponse.json(
      { error: "Failed to generate media URL", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}

/**
 * Extract Cloudflare Stream video UID from various URL formats
 */
function extractVideoUid(mediaUrl: string): string | null {
  // Handle different URL formats:
  // 1. Just the UID: "abc123..."
  // 2. Full URL: "https://customer-xxx.cloudflarestream.com/abc123/..."
  // 3. Iframe embed: "https://iframe.cloudflarestream.com/abc123"

  // If it's just a UID (32 character hex string)
  if (/^[a-f0-9]{32}$/i.test(mediaUrl)) {
    return mediaUrl;
  }

  // Try to extract from URL
  try {
    const url = new URL(mediaUrl);

    // cloudflarestream.com URLs have the UID as the first path segment
    const pathParts = url.pathname.split("/").filter(Boolean);
    if (pathParts.length > 0) {
      // Validate it looks like a Stream UID
      const potentialUid = pathParts[0];
      if (/^[a-f0-9]{32}$/i.test(potentialUid)) {
        return potentialUid;
      }
    }
  } catch {
    // Not a valid URL, might be just a UID
  }

  // If nothing worked, return the original if it looks like a UID
  if (mediaUrl.length === 32 && /^[a-f0-9]+$/i.test(mediaUrl)) {
    return mediaUrl;
  }

  return null;
}

/**
 * Extract R2 object key from various URL formats
 */
function extractR2Key(mediaUrl: string): string | null {
  // Handle different URL formats:
  // 1. Full R2 public URL: "https://pub-xxx.r2.dev/path/to/file.mp3"
  // 2. Full signed URL (already has path): "https://xxx.r2.cloudflarestorage.com/bucket/path/to/file.mp3?..."
  // 3. Just the key: "content/creator123/content456/audio/file.mp3"

  // If it doesn't contain a protocol, it's probably just a key
  if (!mediaUrl.includes("://")) {
    return mediaUrl;
  }

  try {
    const url = new URL(mediaUrl);

    // For R2 URLs, the key is the pathname (minus leading slash)
    // For public domain URLs, also strip the bucket name if present
    const key = url.pathname.replace(/^\//, "");

    // If the URL contains query params, they're signing params - ignore them
    // The key is just the path

    return key || null;
  } catch {
    // Not a valid URL
    return null;
  }
}
