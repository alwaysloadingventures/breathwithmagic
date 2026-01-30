"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard, StatCardSkeleton } from "@/components/creator";
import {
  Eye,
  CheckCircle,
  DollarSign,
  Users,
  BarChart3,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import type {
  AnalyticsResponse,
  AnalyticsPeriod,
} from "@/lib/validations/analytics";

/**
 * Check if analytics data represents an "empty" state
 * (no subscribers, no views, no revenue - typical for new creators)
 */
function isAnalyticsEmpty(data: AnalyticsResponse): boolean {
  return (
    data.totalViews === 0 &&
    data.subscriberCount === 0 &&
    data.totalRevenue === 0 &&
    data.topContent.length === 0 &&
    data.viewsByDay.length === 0
  );
}

interface AnalyticsClientProps {
  initialData: AnalyticsResponse | null;
  initialPeriod: AnalyticsPeriod;
}

/**
 * Analytics Client Component
 *
 * Client component for the analytics dashboard with period selector
 * and interactive charts.
 */
export function AnalyticsClient({
  initialData,
  initialPeriod,
}: AnalyticsClientProps) {
  const [period, setPeriod] = useState<AnalyticsPeriod>(initialPeriod);
  const [data, setData] = useState<AnalyticsResponse | null>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch analytics data for selected period
   */
  const fetchAnalytics = useCallback(
    async (selectedPeriod: AnalyticsPeriod) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/creator/analytics?period=${selectedPeriod}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch analytics");
        }

        const newData = await response.json();
        setData(newData);
      } catch (err) {
        console.error("Error fetching analytics:", err);
        setError("Failed to load analytics. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  /**
   * Handle period change
   */
  const handlePeriodChange = (newPeriod: AnalyticsPeriod) => {
    setPeriod(newPeriod);
    fetchAnalytics(newPeriod);
  };

  // Fetch on mount if no initial data
  useEffect(() => {
    if (!initialData) {
      fetchAnalytics(period);
    }
  }, [initialData, fetchAnalytics, period]);

  // Period label mapping
  const periodLabels: Record<AnalyticsPeriod, string> = {
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "90d": "Last 90 days",
    all: "All time",
  };

  // Check if we have data and it's completely empty (no analytics yet)
  const showEmptyState = !isLoading && !error && data && isAnalyticsEmpty(data);

  return (
    <div className="space-y-8">
      {/* Header with Period Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="mt-1 text-muted-foreground">
            Track your content performance and subscriber growth.
          </p>
        </div>
        {/* Only show period selector when we have actual data to filter */}
        {!showEmptyState && (
          <Select
            value={period}
            onValueChange={(v) => handlePeriodChange(v as AnalyticsPeriod)}
          >
            <SelectTrigger
              className="w-[180px]"
              aria-label="Select time period"
            >
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Error State - only show for actual API failures */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State - friendly message for new creators */}
      {showEmptyState && <AnalyticsEmptyState />}

      {/* Stats Grid - only show when not in empty state */}
      {!showEmptyState && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading || !data ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                label="Total Views"
                value={data.totalViews.toLocaleString()}
                icon={<Eye className="size-5" aria-hidden="true" />}
              />
              <StatCard
                label="Completion Rate"
                value={`${data.completionRate}%`}
                icon={<CheckCircle className="size-5" aria-hidden="true" />}
              />
              <StatCard
                label="Subscribers"
                value={data.subscriberCount.toLocaleString()}
                change={data.subscriberGrowth}
                changeLabel={periodLabels[period]}
                icon={<Users className="size-5" aria-hidden="true" />}
              />
              <StatCard
                label="Revenue"
                value={`$${(data.totalRevenue / 100).toFixed(2)}`}
                change={data.revenueGrowth}
                changeLabel={periodLabels[period]}
                icon={<DollarSign className="size-5" aria-hidden="true" />}
              />
            </>
          )}
        </div>
      )}

      {/* Views Chart - only show when not in empty state */}
      {!showEmptyState && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Views Over Time</CardTitle>
            <CardDescription>
              Daily content views for {periodLabels[period].toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || !data ? (
              <div className="h-64 animate-pulse rounded-lg bg-muted" />
            ) : data.viewsByDay.length === 0 ? (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  No view data available for this period.
                </p>
              </div>
            ) : (
              <ViewsChart data={data.viewsByDay} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Top Content Table - only show when not in empty state */}
      {!showEmptyState && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Content</CardTitle>
            <CardDescription>
              Your best performing content for{" "}
              {periodLabels[period].toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || !data ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 animate-pulse rounded-lg bg-muted"
                  />
                ))}
              </div>
            ) : data.topContent.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No content data available for this period.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Content</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Completions</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topContent.map((content, index) => {
                    const completionRate =
                      content.views > 0
                        ? Math.round(
                            (content.completions / content.views) * 100,
                          )
                        : 0;
                    return (
                      <TableRow key={content.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                              {index + 1}
                            </span>
                            <span className="max-w-[200px] truncate font-medium">
                              {content.title}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {content.views.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {content.completions.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              completionRate >= 50
                                ? "text-green-600"
                                : completionRate >= 25
                                  ? "text-amber-600"
                                  : "text-muted-foreground"
                            }
                          >
                            {completionRate}%
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Simple Views Chart Component
 *
 * A basic bar chart visualization using CSS.
 * In production, consider using a chart library like Recharts or Chart.js.
 */
function ViewsChart({
  data,
}: {
  data: Array<{ date: string; views: number }>;
}) {
  if (data.length === 0) return null;

  const maxViews = Math.max(...data.map((d) => d.views), 1);
  const chartHeight = 200;

  return (
    <div className="relative h-64">
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 flex h-[200px] flex-col justify-between text-xs text-muted-foreground">
        <span>{maxViews}</span>
        <span>{Math.round(maxViews / 2)}</span>
        <span>0</span>
      </div>

      {/* Chart area */}
      <div className="ml-10 h-[200px] overflow-hidden">
        <div className="flex h-full items-end gap-1">
          {data.map((item) => {
            const height = (item.views / maxViews) * chartHeight;
            return (
              <div
                key={item.date}
                className="group relative flex-1 min-w-[4px] max-w-[40px]"
              >
                {/* Bar */}
                <div
                  className="w-full rounded-t bg-primary transition-all group-hover:bg-primary/80"
                  style={{ height: `${height}px` }}
                />
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background group-hover:block">
                  {item.views} views
                  <br />
                  {new Date(item.date).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="ml-10 mt-2 flex justify-between text-xs text-muted-foreground">
        <span>
          {data.length > 0
            ? new Date(data[0].date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })
            : ""}
        </span>
        <span>
          {data.length > 0
            ? new Date(data[data.length - 1].date).toLocaleDateString(
                undefined,
                { month: "short", day: "numeric" },
              )
            : ""}
        </span>
      </div>
    </div>
  );
}

/**
 * Analytics Empty State Component
 *
 * Friendly, encouraging message for new creators with no analytics data yet.
 * Includes placeholder visualization and call-to-action.
 */
function AnalyticsEmptyState() {
  return (
    <div className="space-y-8">
      {/* Main empty state card */}
      <Card className="border-dashed">
        <CardContent className="py-12">
          <div className="text-center">
            {/* Icon */}
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
              <BarChart3
                className="size-8 text-muted-foreground"
                aria-hidden="true"
              />
            </div>

            {/* Message */}
            <h2 className="text-xl font-semibold text-foreground">
              No analytics yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              Analytics will appear once you have subscribers and content views.
              Start creating content and sharing your profile to see your
              performance data here.
            </p>

            {/* Call to action */}
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/creator/content/new"
                className={cn(buttonVariants())}
              >
                <Plus className="mr-2 size-4" aria-hidden="true" />
                Create content
              </Link>
              <Link
                href="/creator/settings"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                View your profile
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder stats with zero values */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Views"
          value="0"
          icon={<Eye className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Completion Rate"
          value="0%"
          icon={<CheckCircle className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Subscribers"
          value="0"
          icon={<Users className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Revenue"
          value="$0.00"
          icon={<DollarSign className="size-5" aria-hidden="true" />}
        />
      </div>

      {/* Placeholder chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Views Over Time</CardTitle>
          <CardDescription>
            Daily content views will appear here as people discover your content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
            <div className="text-center">
              <BarChart3
                className="mx-auto size-10 text-muted-foreground/50"
                aria-hidden="true"
              />
              <p className="mt-2 text-sm text-muted-foreground">
                Your views chart will appear here
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder top content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Content</CardTitle>
          <CardDescription>
            Your best performing content will be listed here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
            <p className="text-sm text-muted-foreground">
              Upload content to see performance rankings
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
