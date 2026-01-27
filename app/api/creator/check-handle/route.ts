/**
 * POST /api/creator/check-handle
 *
 * Check if a creator handle is available
 * Returns availability status and suggestions if taken
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { handleSchema } from "@/lib/validations/creator";

/**
 * Simple in-memory rate limiter for search/check endpoints.
 * PRD specifies 30 requests per minute for this category.
 *
 * TODO: Replace with Upstash Redis rate limiter for production
 * to ensure rate limiting works across multiple serverless instances.
 */
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30;

// Map of userId -> { count, windowStart }
const rateLimitStore = new Map<
  string,
  { count: number; windowStart: number }
>();

function checkRateLimit(userId: string): {
  allowed: boolean;
  remaining: number;
} {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);

  // If no record exists or window has expired, create a new one
  if (!userLimit || now - userLimit.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(userId, { count: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }

  // Check if within limit
  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  // Increment count
  userLimit.count += 1;
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - userLimit.count,
  };
}

// Periodic cleanup of expired entries (runs every 5 minutes)
setInterval(
  () => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (now - value.windowStart >= RATE_LIMIT_WINDOW_MS) {
        rateLimitStore.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // Check rate limit (30 requests per minute per PRD)
    const { allowed, remaining } = checkRateLimit(userId);
    if (!allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again in a minute.",
          code: "RATE_LIMIT_EXCEEDED",
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
            "X-RateLimit-Remaining": String(remaining),
            "Retry-After": "60",
          },
        },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = handleSchema.safeParse(body.handle);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: parseResult.error.issues[0].message,
          code: "VALIDATION_ERROR",
          available: false,
        },
        { status: 400 },
      );
    }

    const handle = parseResult.data;

    // Check if handle is already taken
    const existingCreator = await prisma.creatorProfile.findUnique({
      where: { handle },
      select: { id: true },
    });

    if (existingCreator) {
      // Generate suggestions by appending numbers
      const suggestions = await generateHandleSuggestions(handle);
      return NextResponse.json({
        available: false,
        handle,
        suggestions,
        message: "This handle is already taken",
      });
    }

    // Check reserved handles (admin, support, etc.)
    const reservedHandles = [
      "admin",
      "support",
      "help",
      "breathwithmagic",
      "api",
      "www",
      "app",
      "creator",
      "creators",
      "user",
      "users",
      "settings",
      "home",
      "explore",
      "search",
      "messages",
      "notifications",
    ];

    if (reservedHandles.includes(handle.toLowerCase())) {
      return NextResponse.json({
        available: false,
        handle,
        suggestions: await generateHandleSuggestions(handle),
        message: "This handle is reserved",
      });
    }

    return NextResponse.json({
      available: true,
      handle,
      message: "This handle is available",
    });
  } catch (error) {
    console.error("Error checking handle availability:", error);
    return NextResponse.json(
      { error: "Failed to check handle availability", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}

/**
 * Generate handle suggestions when the requested handle is taken
 */
async function generateHandleSuggestions(
  baseHandle: string,
): Promise<string[]> {
  const candidates: string[] = [];

  // Generate candidate suggestions (numbers first, then underscore+numbers)
  for (let i = 1; i <= 10 && candidates.length < 6; i++) {
    const suggestion = `${baseHandle}${i}`;
    if (suggestion.length <= 30) {
      candidates.push(suggestion);
    }
  }
  for (let i = 1; i <= 10 && candidates.length < 6; i++) {
    const suggestion = `${baseHandle}_${i}`;
    if (suggestion.length <= 30) {
      candidates.push(suggestion);
    }
  }

  // Batch check all candidates in a single query
  const existing = await prisma.creatorProfile.findMany({
    where: { handle: { in: candidates } },
    select: { handle: true },
  });
  const existingSet = new Set(existing.map((e) => e.handle));

  // Return available suggestions (up to 3)
  return candidates.filter((c) => !existingSet.has(c)).slice(0, 3);
}
