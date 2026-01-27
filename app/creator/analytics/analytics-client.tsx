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
import { Eye, CheckCircle, DollarSign, Users } from "lucide-react";
import type {
  AnalyticsResponse,
  AnalyticsPeriod,
} from "@/lib/validations/analytics";

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
        <Select
          value={period}
          onValueChange={(v) => handlePeriodChange(v as AnalyticsPeriod)}
        >
          <SelectTrigger className="w-[180px]" aria-label="Select time period">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
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
              icon={<Eye className="size-5" />}
            />
            <StatCard
              label="Completion Rate"
              value={`${data.completionRate}%`}
              icon={<CheckCircle className="size-5" />}
            />
            <StatCard
              label="Subscribers"
              value={data.subscriberCount.toLocaleString()}
              change={data.subscriberGrowth}
              changeLabel={periodLabels[period]}
              icon={<Users className="size-5" />}
            />
            <StatCard
              label="Revenue"
              value={`$${(data.totalRevenue / 100).toFixed(2)}`}
              change={data.revenueGrowth}
              changeLabel={periodLabels[period]}
              icon={<DollarSign className="size-5" />}
            />
          </>
        )}
      </div>

      {/* Views Chart */}
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

      {/* Top Content Table */}
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
                      ? Math.round((content.completions / content.views) * 100)
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
