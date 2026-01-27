import { Users, DollarSign, Heart } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SocialProofBannerProps {
  /** Total number of active creators */
  creatorCount: number;
  /** Total earnings by creators (in cents) */
  totalEarnings: number;
  /** Total number of subscribers */
  subscriberCount?: number;
  /** Custom className */
  className?: string;
}

/**
 * Format large numbers with K/M suffixes
 */
function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

/**
 * Format cents to dollar display
 */
function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) {
    return `$${(dollars / 1_000_000).toFixed(1)}M`;
  }
  if (dollars >= 1_000) {
    return `$${(dollars / 1_000).toFixed(0)}K`;
  }
  return `$${dollars.toLocaleString()}`;
}

/**
 * SocialProofBanner - Stats display showing platform social proof
 *
 * Displays "X creators have earned $Y" and other platform metrics.
 * Used on the homepage to build trust.
 */
export function SocialProofBanner({
  creatorCount,
  totalEarnings,
  subscriberCount,
  className,
}: SocialProofBannerProps) {
  return (
    <section className={cn("py-12 bg-muted/50", className)}>
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
          {/* Creator Count */}
          <div className="flex items-center gap-3 text-center md:text-left">
            <div className="p-3 rounded-full bg-primary/10">
              <Users className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-semibold text-foreground">
                {formatNumber(creatorCount)}
              </p>
              <p className="text-sm text-muted-foreground">Active creators</p>
            </div>
          </div>

          {/* Divider - visible on larger screens */}
          <div className="hidden md:block w-px h-12 bg-border" />

          {/* Earnings */}
          <div className="flex items-center gap-3 text-center md:text-left">
            <div className="p-3 rounded-full bg-primary/10">
              <DollarSign className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-semibold text-foreground">
                {formatCurrency(totalEarnings)}
              </p>
              <p className="text-sm text-muted-foreground">
                Earned by creators
              </p>
            </div>
          </div>

          {/* Subscriber Count - optional */}
          {subscriberCount !== undefined && subscriberCount > 0 && (
            <>
              {/* Divider */}
              <div className="hidden md:block w-px h-12 bg-border" />

              <div className="flex items-center gap-3 text-center md:text-left">
                <div className="p-3 rounded-full bg-primary/10">
                  <Heart className="size-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl md:text-3xl font-semibold text-foreground">
                    {formatNumber(subscriberCount)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Active subscribers
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Summary Text */}
        <p className="text-center text-muted-foreground mt-8 max-w-xl mx-auto">
          {creatorCount} creators have earned {formatCurrency(totalEarnings)}{" "}
          sharing their wellness practices with subscribers worldwide.
        </p>
      </div>
    </section>
  );
}

/**
 * SocialProofBannerSkeleton - Loading state for social proof section
 */
export function SocialProofBannerSkeleton() {
  return (
    <section className="py-12 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="size-12 rounded-full bg-muted animate-pulse" />
              <div>
                <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-24 bg-muted animate-pulse rounded mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
