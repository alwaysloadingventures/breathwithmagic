/**
 * Admin Reports API
 *
 * GET /api/admin/reports - List content reports with filters
 * PATCH /api/admin/reports - Update report status
 *
 * Admin-only access required for all endpoints.
 *
 * @see PRD Phase 6, Task 18: Content Moderation
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/middleware/admin-check";
import {
  reportListQuerySchema,
  updateReportSchema,
  type ReportReason,
  type ReportStatus,
} from "@/lib/validations/report";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/admin/reports
 *
 * List content reports with optional filters.
 * Returns paginated results with content and reporter details.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin access
    const adminCheck = await requireAdmin();
    if (adminCheck.error) {
      return adminCheck.error;
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryResult = reportListQuerySchema.safeParse({
      status: searchParams.get("status") || undefined,
      reason: searchParams.get("reason") || undefined,
      contentId: searchParams.get("contentId") || undefined,
      cursor: searchParams.get("cursor") || undefined,
      limit: searchParams.get("limit") || 20,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          code: "VALIDATION_ERROR",
          details: queryResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { status, reason, contentId, cursor, limit } = queryResult.data;

    // Build where clause with proper Prisma types
    const where: Prisma.ContentReportWhereInput = {};

    if (status) where.status = status as ReportStatus;
    if (reason) where.reason = reason as ReportReason;
    if (contentId) where.contentId = contentId;

    // Fetch reports with pagination
    const reports = await prisma.contentReport.findMany({
      where,
      take: limit + 1, // Fetch one extra for cursor
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        content: {
          select: {
            id: true,
            title: true,
            type: true,
            thumbnailUrl: true,
            status: true,
            creator: {
              select: {
                id: true,
                handle: true,
                displayName: true,
              },
            },
          },
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Determine if there are more results
    const hasMore = reports.length > limit;
    const items = hasMore ? reports.slice(0, limit) : reports;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // Get counts by status
    const statusCounts = await prisma.contentReport.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    const counts = statusCounts.reduce(
      (acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      items: items.map((report) => ({
        id: report.id,
        reason: report.reason,
        description: report.description,
        status: report.status,
        reviewedBy: report.reviewedBy,
        reviewedAt: report.reviewedAt?.toISOString() || null,
        reviewNotes: report.reviewNotes,
        createdAt: report.createdAt.toISOString(),
        content: {
          id: report.content.id,
          title: report.content.title,
          type: report.content.type,
          thumbnailUrl: report.content.thumbnailUrl,
          status: report.content.status,
          creator: report.content.creator,
        },
        reporter: {
          id: report.reporter.id,
          name: report.reporter.name,
          email: report.reporter.email,
        },
      })),
      nextCursor,
      counts: {
        pending: counts.PENDING || 0,
        reviewed: counts.REVIEWED || 0,
        actionTaken: counts.ACTION_TAKEN || 0,
        dismissed: counts.DISMISSED || 0,
        total: Object.values(counts).reduce((sum, c) => sum + c, 0),
      },
    });
  } catch (error) {
    console.error("Error listing reports:", error);
    return NextResponse.json(
      { error: "Failed to list reports", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/reports
 *
 * Update a report's status and add review notes.
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin access
    const adminCheck = await requireAdmin();
    if (adminCheck.error) {
      return adminCheck.error;
    }

    // Parse request body
    const body = await request.json();
    const { reportId, ...updateData } = body;

    if (!reportId || typeof reportId !== "string") {
      return NextResponse.json(
        { error: "Report ID is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // Validate update data
    const validationResult = updateReportSchema.safeParse(updateData);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid update data",
          code: "VALIDATION_ERROR",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { status, reviewNotes } = validationResult.data;

    // Verify report exists
    const existingReport = await prisma.contentReport.findUnique({
      where: { id: reportId },
    });

    if (!existingReport) {
      return NextResponse.json(
        { error: "Report not found", code: "REPORT_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Update the report
    const updatedReport = await prisma.contentReport.update({
      where: { id: reportId },
      data: {
        status,
        reviewNotes: reviewNotes || null,
        reviewedBy: adminCheck.userId,
        reviewedAt: new Date(),
      },
      include: {
        content: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Report updated successfully",
      report: {
        id: updatedReport.id,
        status: updatedReport.status,
        reviewedBy: updatedReport.reviewedBy,
        reviewedAt: updatedReport.reviewedAt?.toISOString(),
        reviewNotes: updatedReport.reviewNotes,
        content: updatedReport.content,
      },
    });
  } catch (error) {
    console.error("Error updating report:", error);
    return NextResponse.json(
      { error: "Failed to update report", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
