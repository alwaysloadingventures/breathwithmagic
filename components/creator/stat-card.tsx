import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Stat Card Component
 *
 * Displays a single statistic with optional trend indicator.
 */
export function StatCard({
  label,
  value,
  change,
  changeLabel,
  icon,
  className,
}: StatCardProps) {
  const showChange = typeof change === "number";
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 sm:p-6",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {value}
          </p>
        </div>
        {icon && (
          <div className="rounded-lg bg-muted p-2 text-muted-foreground">
            {icon}
          </div>
        )}
      </div>

      {showChange && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={cn(
              "flex items-center gap-0.5 text-sm font-medium",
              isPositive && "text-green-600",
              isNegative && "text-red-600",
              !isPositive && !isNegative && "text-muted-foreground",
            )}
          >
            {isPositive && <TrendingUp className="size-4" aria-hidden="true" />}
            {isNegative && (
              <TrendingDown className="size-4" aria-hidden="true" />
            )}
            {!isPositive && !isNegative && (
              <Minus className="size-4" aria-hidden="true" />
            )}
            {isPositive && "+"}
            {change}%
          </span>
          {changeLabel && (
            <span className="text-sm text-muted-foreground">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Stat Card Skeleton
 *
 * Loading skeleton for stat cards.
 */
export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="space-y-3">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
