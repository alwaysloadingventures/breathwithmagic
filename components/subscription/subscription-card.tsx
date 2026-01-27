"use client";

import Link from "next/link";
import { format } from "date-fns";
import type { CreatorCategory, SubscriptionPriceTier } from "@prisma/client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TrialBadge } from "./trial-badge";
import { CancelSubscriptionDialog } from "./cancel-dialog";
import { ReactivateSubscriptionDialog } from "./reactivate-dialog";

/**
 * Converts cents to display string
 */
function formatCentsToDisplay(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

/**
 * Maps category enums to human-readable labels
 */
const CATEGORY_LABELS: Record<CreatorCategory, string> = {
  Breathwork: "Breathwork",
  Yoga: "Yoga",
  Meditation: "Meditation",
  Mindfulness: "Mindfulness",
  Somatic: "Somatic",
  SoundHealing: "Sound Healing",
  Movement: "Movement",
  Coaching: "Coaching",
  Sleep: "Sleep",
  StressRelief: "Stress Relief",
};

/**
 * Status badge variant mapping
 */
const STATUS_VARIANTS: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  active: { label: "Active", variant: "default" },
  trialing: { label: "Trial", variant: "secondary" },
  past_due: { label: "Past due", variant: "destructive" },
  canceled: { label: "Canceled", variant: "outline" },
};

/**
 * Props for SubscriptionCard component
 */
export interface SubscriptionCardProps {
  /** Subscription ID */
  id: string;
  /** Subscription status */
  status: "active" | "trialing" | "past_due" | "canceled";
  /** Price at time of purchase (cents) - for grandfathered pricing */
  priceAtPurchase: number;
  /** Current period start date */
  currentPeriodStart: string | null;
  /** Current period end date */
  currentPeriodEnd: string | null;
  /** Whether subscription is set to cancel at period end */
  cancelAtPeriodEnd: boolean;
  /** Creator information */
  creator: {
    id: string;
    handle: string;
    displayName: string;
    avatarUrl: string | null;
    category: CreatorCategory;
    currentPrice: SubscriptionPriceTier;
  };
  /** Callback when subscription is updated (e.g., canceled) */
  onUpdate?: () => void;
  /** Custom className */
  className?: string;
}

/**
 * SubscriptionCard - Displays a subscription in the user's subscription list
 *
 * Shows:
 * - Creator info (avatar, name, category)
 * - Subscription status (active, trialing, past_due, canceled)
 * - Price and billing cycle
 * - Trial status and end date
 * - Next billing date
 * - Cancel option
 */
export function SubscriptionCard({
  id,
  status,
  priceAtPurchase,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  creator,
  onUpdate,
  className,
}: SubscriptionCardProps) {
  const initials = creator.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const periodEndDate = currentPeriodEnd ? new Date(currentPeriodEnd) : null;

  // Determine if price is grandfathered (different from current price)
  const currentPriceCents = parseInt(
    creator.currentPrice.replace("TIER_", ""),
    10,
  );
  const isGrandfathered = priceAtPurchase !== currentPriceCents;

  const { label: statusLabel, variant: statusVariant } = STATUS_VARIANTS[
    status
  ] || { label: status, variant: "outline" as const };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        <div className="flex items-start gap-4 p-4">
          {/* Creator Avatar */}
          <Link
            href={`/${creator.handle}`}
            className="shrink-0"
            aria-label={`View ${creator.displayName}'s profile`}
          >
            <Avatar className="size-14 border-2 border-border hover:ring-2 hover:ring-primary/20 transition-all">
              {creator.avatarUrl ? (
                <AvatarImage
                  src={creator.avatarUrl}
                  alt={creator.displayName}
                />
              ) : null}
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
          </Link>

          {/* Subscription Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link
                  href={`/${creator.handle}`}
                  className="font-semibold text-foreground hover:text-primary transition-colors"
                >
                  {creator.displayName}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground">
                    {CATEGORY_LABELS[creator.category]}
                  </span>
                  <Badge variant={statusVariant} className="h-5 text-xs">
                    {statusLabel}
                  </Badge>
                  {status === "trialing" && periodEndDate && (
                    <TrialBadge trialEndDate={periodEndDate} />
                  )}
                </div>
              </div>
            </div>

            {/* Price and Billing Info */}
            <div className="mt-3 space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-foreground">
                  {formatCentsToDisplay(priceAtPurchase)}/month
                </span>
                {isGrandfathered && (
                  <Badge variant="outline" className="text-xs">
                    Grandfathered price
                  </Badge>
                )}
              </div>

              {periodEndDate && (
                <p className="text-sm text-muted-foreground">
                  {cancelAtPeriodEnd ? (
                    <>
                      Access until{" "}
                      <span className="font-medium">
                        {format(periodEndDate, "MMMM d, yyyy")}
                      </span>
                    </>
                  ) : status === "trialing" ? (
                    <>
                      Trial ends{" "}
                      <span className="font-medium">
                        {format(periodEndDate, "MMMM d, yyyy")}
                      </span>
                    </>
                  ) : (
                    <>
                      Next billing{" "}
                      <span className="font-medium">
                        {format(periodEndDate, "MMMM d, yyyy")}
                      </span>
                    </>
                  )}
                </p>
              )}

              {cancelAtPeriodEnd && status !== "canceled" && (
                <p className="text-sm text-destructive">
                  Your subscription is canceled. You have access until the date
                  above.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 px-4 py-3 bg-muted/50 border-t border-border">
          <Link href={`/${creator.handle}`}>
            <Button variant="ghost" size="default">
              View content
            </Button>
          </Link>

          {status !== "canceled" && !cancelAtPeriodEnd && periodEndDate && (
            <CancelSubscriptionDialog
              subscriptionId={id}
              creatorName={creator.displayName}
              periodEnd={periodEndDate}
              onCancelComplete={onUpdate}
            />
          )}

          {cancelAtPeriodEnd && status !== "canceled" && periodEndDate && (
            <ReactivateSubscriptionDialog
              subscriptionId={id}
              creatorName={creator.displayName}
              periodEnd={periodEndDate}
              priceAtPurchase={priceAtPurchase}
              onReactivateComplete={onUpdate}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * SubscriptionCardSkeleton - Loading placeholder for SubscriptionCard
 */
export function SubscriptionCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-start gap-4 p-4">
          <div className="size-14 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 min-w-0">
            <div className="h-5 w-32 bg-muted animate-pulse rounded" />
            <div className="h-4 w-24 bg-muted animate-pulse rounded mt-2" />
            <div className="h-4 w-20 bg-muted animate-pulse rounded mt-3" />
            <div className="h-4 w-40 bg-muted animate-pulse rounded mt-1" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-muted/50 border-t border-border">
          <div className="h-7 w-24 bg-muted animate-pulse rounded" />
          <div className="h-7 w-32 bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
    </Card>
  );
}
