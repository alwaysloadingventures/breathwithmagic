/**
 * POST /api/content/[id]/report
 *
 * Report content for moderation review.
 * Requires authentication. Rate limited to 10 reports per hour per user.
 * Prevents duplicate reports from the same user on the same content.
 *
 * @see PRD Phase 6, Task 18: Content Moderation
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { reportRateLimiter } from "@/lib/rate-limit";
import { createReportSchema } from "@/lib/validations/report";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: contentId } = await params;

    // Require authentication
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: "Please sign in to report content", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Rate limit check
    const rateLimitResult = await reportRateLimiter.checkAsync(user.id);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error:
            "You've submitted too many reports recently. Please try again later.",
          code: "RATE_LIMITED",
          retryAfter: rateLimitResult.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfterSeconds),
          },
        }
      );
    }

    // Verify content exists and is published
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      select: {
        id: true,
        status: true,
        creatorId: true,
        title: true,
      },
    });

    if (!content) {
      return NextResponse.json(
        { error: "Content not found", code: "CONTENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (content.status !== "published") {
      return NextResponse.json(
        { error: "Content not found", code: "CONTENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createReportSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid report data",
          code: "VALIDATION_ERROR",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { reason, description } = validationResult.data;

    // Check for existing report from this user
    const existingReport = await prisma.contentReport.findUnique({
      where: {
        contentId_reporterId: {
          contentId,
          reporterId: user.id,
        },
      },
    });

    if (existingReport) {
      return NextResponse.json(
        {
          error: "You have already reported this content",
          code: "DUPLICATE_REPORT",
        },
        { status: 409 }
      );
    }

    // Create the report
    const report = await prisma.contentReport.create({
      data: {
        contentId,
        reporterId: user.id,
        reason,
        description: description || null,
      },
      select: {
        id: true,
        reason: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Thank you for your report. Our team will review it shortly.",
        report: {
          id: report.id,
          reason: report.reason,
          status: report.status,
          createdAt: report.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating report:", error);
    return NextResponse.json(
      { error: "Failed to submit report. Please try again.", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
