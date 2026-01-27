"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { CreatorCategory, SubscriptionPriceTier } from "@prisma/client";

import { Button } from "@/components/ui/button";
import {
  SubscriptionCard,
  SubscriptionCardSkeleton,
} from "@/components/subscription";

/**
 * Subscription data type matching the API response
 */
interface Subscription {
  id: string;
  status: "active" | "trialing" | "past_due" | "canceled";
  priceAtPurchase: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  creator: {
    id: string;
    handle: string;
    displayName: string;
    avatarUrl: string | null;
    category: CreatorCategory;
    currentPrice: SubscriptionPriceTier;
  };
}

/**
 * Props for SubscriptionsClient
 */
interface SubscriptionsClientProps {
  /** Initial subscriptions from server */
  initialSubscriptions: Subscription[];
}

/**
 * SubscriptionsClient - Client component for subscription list
 *
 * Handles:
 * - Displaying subscription cards
 * - Filtering by status
 * - Refreshing data after updates
 * - Loading more subscriptions (pagination)
 */
export function SubscriptionsClient({
  initialSubscriptions,
}: SubscriptionsClientProps) {
  const router = useRouter();
  const [subscriptions, setSubscriptions] =
    useState<Subscription[]>(initialSubscriptions);
  const [filter, setFilter] = useState<
    "all" | "active" | "trialing" | "past_due" | "canceled"
  >("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cursor, setCursor] = useState<string | null>(
    initialSubscriptions.length > 0
      ? initialSubscriptions[initialSubscriptions.length - 1].id
      : null,
  );
  const [hasMore, setHasMore] = useState(initialSubscriptions.length >= 20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  /**
   * Refresh subscriptions from the API
   */
  const refreshSubscriptions = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/subscriptions?limit=20");
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data.items);
        setCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
      }
    } catch (error) {
      console.error("Failed to refresh subscriptions:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  /**
   * Load more subscriptions
   */
  const loadMore = useCallback(async () => {
    if (!cursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const response = await fetch(
        `/api/subscriptions?cursor=${cursor}&limit=20`,
      );
      if (response.ok) {
        const data = await response.json();
        setSubscriptions((prev) => [...prev, ...data.items]);
        setCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
      }
    } catch (error) {
      console.error("Failed to load more subscriptions:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [cursor, isLoadingMore]);

  /**
   * Handle subscription update (e.g., after cancellation)
   */
  const handleUpdate = useCallback(() => {
    refreshSubscriptions();
    router.refresh();
  }, [refreshSubscriptions, router]);

  // Filter subscriptions based on selected filter
  const filteredSubscriptions =
    filter === "all"
      ? subscriptions
      : subscriptions.filter((sub) => sub.status === filter);

  // Count subscriptions by status
  const counts = {
    all: subscriptions.length,
    active: subscriptions.filter(
      (s) => s.status === "active" || s.status === "trialing",
    ).length,
    trialing: subscriptions.filter((s) => s.status === "trialing").length,
    past_due: subscriptions.filter((s) => s.status === "past_due").length,
    canceled: subscriptions.filter((s) => s.status === "canceled").length,
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex items-center gap-3 overflow-x-auto pb-4">
        <FilterButton
          active={filter === "all"}
          onClick={() => setFilter("all")}
          count={counts.all}
        >
          All
        </FilterButton>
        <FilterButton
          active={filter === "active"}
          onClick={() => setFilter("active")}
          count={counts.active}
        >
          Active
        </FilterButton>
        {counts.trialing > 0 && (
          <FilterButton
            active={filter === "trialing"}
            onClick={() => setFilter("trialing")}
            count={counts.trialing}
          >
            Trial
          </FilterButton>
        )}
        {counts.past_due > 0 && (
          <FilterButton
            active={filter === "past_due"}
            onClick={() => setFilter("past_due")}
            count={counts.past_due}
          >
            Past due
          </FilterButton>
        )}
        {counts.canceled > 0 && (
          <FilterButton
            active={filter === "canceled"}
            onClick={() => setFilter("canceled")}
            count={counts.canceled}
          >
            Canceled
          </FilterButton>
        )}
      </div>

      {/* Subscription List */}
      {isRefreshing ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <SubscriptionCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredSubscriptions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {filter === "all"
              ? "No subscriptions found"
              : `No ${filter.replace("_", " ")} subscriptions`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSubscriptions.map((subscription) => (
            <SubscriptionCard
              key={subscription.id}
              id={subscription.id}
              status={subscription.status}
              priceAtPurchase={subscription.priceAtPurchase}
              currentPeriodStart={subscription.currentPeriodStart}
              currentPeriodEnd={subscription.currentPeriodEnd}
              cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
              creator={subscription.creator}
              onUpdate={handleUpdate}
            />
          ))}

          {/* Load More */}
          {hasMore && filter === "all" && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Info Text */}
      <div className="pt-6 border-t border-border">
        <p className="text-sm text-muted-foreground text-center">
          You can cancel your subscription at any time and retain access until
          the end of your billing period.
        </p>
      </div>
    </div>
  );
}

/**
 * FilterButton - Tab button for filtering subscriptions
 */
function FilterButton({
  children,
  active,
  onClick,
  count,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
        ${
          active
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        }
      `}
    >
      {children}
      <span
        className={`
        text-xs px-1.5 py-0.5 rounded-full
        ${active ? "bg-primary-foreground/20" : "bg-background"}
      `}
      >
        {count}
      </span>
    </button>
  );
}
