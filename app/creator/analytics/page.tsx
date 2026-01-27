import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AnalyticsClient } from "./analytics-client";
import {
  getPeriodStartDate,
  type AnalyticsResponse,
} from "@/lib/validations/analytics";

/**
 * Analytics Page
 *
 * Server component that fetches initial analytics data and renders
 * the client component for interactivity.
 */
export default async function AnalyticsPage() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/sign-in");
  }

  // Fetch creator profile
  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      creatorProfile: {
        select: { id: true },
      },
    },
  });

  if (!user?.creatorProfile) {
    redirect("/become-creator");
  }

  const creatorId = user.creatorProfile.id;
  const defaultPeriod = "30d" as const;
  const periodStart = getPeriodStartDate(defaultPeriod);

  // Fetch initial analytics data for 30d
  try {
    // Get total views
    const totalViews = await prisma.contentView.count({
      where: {
        content: { creatorId },
        createdAt: periodStart ? { gte: periodStart } : undefined,
      },
    });

    // Get completed views
    const completedViews = await prisma.contentView.count({
      where: {
        content: { creatorId },
        completedAt: { not: null },
        createdAt: periodStart ? { gte: periodStart } : undefined,
      },
    });

    const completionRate =
      totalViews > 0 ? Math.round((completedViews / totalViews) * 100) : 0;

    // Get subscriber count
    const subscriberCount = await prisma.subscription.count({
      where: {
        creatorId,
        status: { in: ["active", "trialing"] },
      },
    });

    // Calculate revenue
    const revenueAgg = await prisma.subscription.aggregate({
      where: {
        creatorId,
        status: { in: ["active", "trialing"] },
        createdAt: periodStart ? { gte: periodStart } : undefined,
      },
      _sum: {
        priceAtPurchase: true,
      },
    });
    const totalRevenue = revenueAgg._sum.priceAtPurchase || 0;

    // Get top content
    const topContentRaw = await prisma.contentView.groupBy({
      by: ["contentId"],
      where: {
        content: { creatorId },
        createdAt: periodStart ? { gte: periodStart } : undefined,
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    });

    const topContentIds = topContentRaw.map((c) => c.contentId);
    const completionCounts = await prisma.contentView.groupBy({
      by: ["contentId"],
      where: {
        contentId: { in: topContentIds },
        completedAt: { not: null },
        createdAt: periodStart ? { gte: periodStart } : undefined,
      },
      _count: { id: true },
    });

    const completionMap = new Map(
      completionCounts.map((c) => [c.contentId, c._count.id]),
    );

    const contentDetails = await prisma.content.findMany({
      where: { id: { in: topContentIds } },
      select: { id: true, title: true },
    });

    const contentMap = new Map(contentDetails.map((c) => [c.id, c.title]));

    const topContent = topContentRaw.map((c) => ({
      id: c.contentId,
      title: contentMap.get(c.contentId) || "Unknown",
      views: c._count.id,
      completions: completionMap.get(c.contentId) || 0,
    }));

    // Get views by day using raw query
    const viewsByDayRaw = await prisma.$queryRaw<
      Array<{ date: Date; count: bigint }>
    >`
      SELECT DATE(cv."createdAt") as date, COUNT(*) as count
      FROM "ContentView" cv
      JOIN "Content" c ON cv."contentId" = c.id
      WHERE c."creatorId" = ${creatorId}
      ${periodStart ? prisma.$queryRaw`AND cv."createdAt" >= ${periodStart}` : prisma.$queryRaw``}
      GROUP BY DATE(cv."createdAt")
      ORDER BY date ASC
    `;

    const viewsByDay = viewsByDayRaw.map((row) => ({
      date: row.date.toISOString().split("T")[0],
      views: Number(row.count),
    }));

    const initialData: AnalyticsResponse = {
      totalViews,
      completionRate,
      totalRevenue,
      revenueGrowth: 0, // Calculated on client when period changes
      subscriberCount,
      subscriberGrowth: 0, // Calculated on client when period changes
      topContent,
      viewsByDay,
    };

    return (
      <AnalyticsClient
        initialData={initialData}
        initialPeriod={defaultPeriod}
      />
    );
  } catch (error) {
    console.error("Error fetching initial analytics:", error);
    // Return client component without initial data - it will fetch on mount
    return <AnalyticsClient initialData={null} initialPeriod={defaultPeriod} />;
  }
}
