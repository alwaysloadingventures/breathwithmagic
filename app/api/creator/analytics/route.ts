/**
 * /api/creator/analytics
 *
 * GET - Get creator analytics data
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  analyticsQuerySchema,
  getPeriodStartDate,
  type AnalyticsResponse,
} from "@/lib/validations/analytics";
import { createRateLimiter } from "@/lib/rate-limit";

/**
 * Rate limiter for analytics API
 * PRD: 100 requests per minute for general API endpoints
 */
const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
});

/**
 * GET /api/creator/analytics
 *
 * Returns analytics data for the authenticated creator
 * Query params: period=7d|30d|90d|all (default: 30d)
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

    // Check rate limit
    const rateLimitResult = apiRateLimiter.check(clerkId);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" },
        {
          status: 429,
          headers: {
            "Retry-After":
              rateLimitResult.retryAfterSeconds?.toString() || "60",
          },
        },
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

    const creatorId = user.creatorProfile.id;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryResult = analyticsQuerySchema.safeParse({
      period: searchParams.get("period") || "30d",
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

    const { period } = queryResult.data;
    const periodStart = getPeriodStartDate(period);
    const previousPeriodStart = periodStart
      ? new Date(periodStart.getTime() - (Date.now() - periodStart.getTime()))
      : null;

    // Build date filter for current period
    const currentPeriodFilter = periodStart ? { gte: periodStart } : undefined;

    // Build date filter for previous period (for growth calculations)
    const previousPeriodFilter =
      periodStart && previousPeriodStart
        ? { gte: previousPeriodStart, lt: periodStart }
        : undefined;

    // Get total views for current period
    const totalViews = await prisma.contentView.count({
      where: {
        content: { creatorId },
        createdAt: currentPeriodFilter,
      },
    });

    // Get completed views for completion rate
    const completedViews = await prisma.contentView.count({
      where: {
        content: { creatorId },
        completedAt: { not: null },
        createdAt: currentPeriodFilter,
      },
    });

    const completionRate =
      totalViews > 0 ? Math.round((completedViews / totalViews) * 100) : 0;

    // Get current subscriber count (active + trialing)
    const subscriberCount = await prisma.subscription.count({
      where: {
        creatorId,
        status: { in: ["active", "trialing"] },
      },
    });

    // Get previous period subscriber count for growth
    let subscriberGrowth = 0;
    if (previousPeriodFilter) {
      const previousSubscriberCount = await prisma.subscription.count({
        where: {
          creatorId,
          status: { in: ["active", "trialing"] },
          createdAt: previousPeriodFilter,
        },
      });
      const currentPeriodNewSubs = await prisma.subscription.count({
        where: {
          creatorId,
          status: { in: ["active", "trialing"] },
          createdAt: currentPeriodFilter,
        },
      });

      if (previousSubscriberCount > 0) {
        subscriberGrowth = Math.round(
          ((currentPeriodNewSubs - previousSubscriberCount) /
            previousSubscriberCount) *
            100,
        );
      } else if (currentPeriodNewSubs > 0) {
        subscriberGrowth = 100;
      }
    }

    // Calculate revenue for current period
    // Sum of priceAtPurchase for active subscriptions created in period
    const revenueAgg = await prisma.subscription.aggregate({
      where: {
        creatorId,
        status: { in: ["active", "trialing"] },
        createdAt: currentPeriodFilter,
      },
      _sum: {
        priceAtPurchase: true,
      },
    });
    const totalRevenue = revenueAgg._sum.priceAtPurchase || 0;

    // Calculate previous period revenue for growth
    let revenueGrowth = 0;
    if (previousPeriodFilter) {
      const previousRevenueAgg = await prisma.subscription.aggregate({
        where: {
          creatorId,
          status: { in: ["active", "trialing"] },
          createdAt: previousPeriodFilter,
        },
        _sum: {
          priceAtPurchase: true,
        },
      });
      const previousRevenue = previousRevenueAgg._sum.priceAtPurchase || 0;

      if (previousRevenue > 0) {
        revenueGrowth = Math.round(
          ((totalRevenue - previousRevenue) / previousRevenue) * 100,
        );
      } else if (totalRevenue > 0) {
        revenueGrowth = 100;
      }
    }

    // Get top content by views
    const topContentRaw = await prisma.contentView.groupBy({
      by: ["contentId"],
      where: {
        content: { creatorId },
        createdAt: currentPeriodFilter,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 5,
    });

    // Get completion counts for top content
    const topContentIds = topContentRaw.map((c) => c.contentId);
    const completionCounts = await prisma.contentView.groupBy({
      by: ["contentId"],
      where: {
        contentId: { in: topContentIds },
        completedAt: { not: null },
        createdAt: currentPeriodFilter,
      },
      _count: {
        id: true,
      },
    });

    const completionMap = new Map(
      completionCounts.map((c) => [c.contentId, c._count.id]),
    );

    // Get content details
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

    // Get views by day
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

    const response: AnalyticsResponse = {
      totalViews,
      completionRate,
      totalRevenue,
      revenueGrowth,
      subscriberCount,
      subscriberGrowth,
      topContent,
      viewsByDay,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
