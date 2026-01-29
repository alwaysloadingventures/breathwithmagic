/**
 * Admin Moderation Queue Page
 *
 * Displays pending content reports for admin review.
 * Provides filtering, content preview, and moderation actions.
 *
 * @see PRD Phase 6, Task 18: Content Moderation
 */

import { redirect } from "next/navigation";
import { getAdminStatus } from "@/lib/middleware/admin-check";
import { prisma } from "@/lib/prisma";
import { ModerationQueue } from "./moderation-queue";

export const metadata = {
  title: "Content Moderation | Admin | breathwithmagic",
  description: "Review and moderate reported content",
};

export default async function ModerationPage() {
  // Check admin access
  const adminStatus = await getAdminStatus();

  if (!adminStatus.isAdmin) {
    redirect("/home");
  }

  // Get initial data for the page
  const [reports, counts] = await Promise.all([
    prisma.contentReport.findMany({
      take: 20,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        content: {
          select: {
            id: true,
            title: true,
            type: true,
            thumbnailUrl: true,
            status: true,
            description: true,
            creator: {
              select: {
                id: true,
                handle: true,
                displayName: true,
                avatarUrl: true,
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
    }),
    prisma.contentReport.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ]);

  // Format counts
  const statusCounts = counts.reduce(
    (acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    },
    {} as Record<string, number>
  );

  const formattedCounts = {
    pending: statusCounts.PENDING || 0,
    reviewed: statusCounts.REVIEWED || 0,
    actionTaken: statusCounts.ACTION_TAKEN || 0,
    dismissed: statusCounts.DISMISSED || 0,
    total: Object.values(statusCounts).reduce((sum, c) => sum + c, 0),
  };

  // Format reports for client
  const formattedReports = reports.map((report) => ({
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
      description: report.content.description,
      creator: report.content.creator,
    },
    reporter: {
      id: report.reporter.id,
      name: report.reporter.name,
      email: report.reporter.email,
    },
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground"
      >
        Skip to main content
      </a>

      <main id="main-content" className="container max-w-6xl py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">
            Content Moderation
          </h1>
          <p className="text-muted-foreground mt-1">
            Review reported content and take appropriate action
          </p>
        </div>

        <ModerationQueue initialReports={formattedReports} counts={formattedCounts} />
      </main>
    </div>
  );
}
