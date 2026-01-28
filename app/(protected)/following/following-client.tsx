"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { CreatorCategory, SubscriptionPriceTier } from "@prisma/client";

import { Button } from "@/components/ui/button";
import {
  FollowingCreatorCard,
  FollowingCreatorCardSkeleton,
} from "./following-creator-card";

/**
 * Following data type matching the API response
 */
interface Following {
  followId: string;
  followedAt: string;
  creator: {
    id: string;
    handle: string;
    displayName: string;
    avatarUrl: string | null;
    coverImageUrl: string | null;
    bio: string | null;
    category: CreatorCategory;
    subscriptionPrice: SubscriptionPriceTier;
    trialEnabled: boolean;
    isVerified: boolean;
    stats: {
      subscriberCount: number;
      followerCount: number;
      contentCount: number;
    };
  };
}

/**
 * Props for FollowingClient
 */
interface FollowingClientProps {
  /** Initial follows from server */
  initialFollows: Following[];
  /** Total count of follows */
  totalCount: number;
}

/**
 * FollowingClient - Client component for the following list
 *
 * Handles:
 * - Displaying followed creator cards in a grid
 * - Unfollow functionality with optimistic updates
 * - Loading more creators (pagination)
 */
export function FollowingClient({
  initialFollows,
  totalCount,
}: FollowingClientProps) {
  const router = useRouter();
  const [follows, setFollows] = useState<Following[]>(initialFollows);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cursor, setCursor] = useState<string | null>(
    initialFollows.length > 0
      ? initialFollows[initialFollows.length - 1].followId
      : null,
  );
  const [hasMore, setHasMore] = useState(initialFollows.length >= 20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  /**
   * Refresh following list from the API
   */
  const refreshFollowing = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/user/following?limit=20");
      if (response.ok) {
        const data = await response.json();
        setFollows(data.items);
        setCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
      }
    } catch (error) {
      console.error("Failed to refresh following list:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  /**
   * Load more follows
   */
  const loadMore = useCallback(async () => {
    if (!cursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const response = await fetch(
        `/api/user/following?cursor=${cursor}&limit=20`,
      );
      if (response.ok) {
        const data = await response.json();
        setFollows((prev) => [...prev, ...data.items]);
        setCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
      }
    } catch (error) {
      console.error("Failed to load more follows:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [cursor, isLoadingMore]);

  /**
   * Handle unfollow with optimistic update
   */
  const handleUnfollow = useCallback(
    async (creatorId: string) => {
      // Optimistically remove from list
      setFollows((prev) => prev.filter((f) => f.creator.id !== creatorId));

      try {
        const response = await fetch(`/api/creators/${creatorId}/follow`, {
          method: "DELETE",
        });

        if (!response.ok) {
          // Revert on error
          refreshFollowing();
        } else {
          // Refresh router to update server state
          router.refresh();
        }
      } catch (error) {
        console.error("Failed to unfollow:", error);
        // Revert on error
        refreshFollowing();
      }
    },
    [refreshFollowing, router],
  );

  return (
    <div className="space-y-6">
      {/* Count */}
      <p className="text-sm text-muted-foreground">
        Following {totalCount} creator{totalCount !== 1 ? "s" : ""}
      </p>

      {/* Following Grid */}
      {isRefreshing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <FollowingCreatorCardSkeleton key={i} />
          ))}
        </div>
      ) : follows.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No creators found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {follows.map((follow) => (
              <FollowingCreatorCard
                key={follow.followId}
                handle={follow.creator.handle}
                displayName={follow.creator.displayName}
                bio={follow.creator.bio}
                avatarUrl={follow.creator.avatarUrl}
                coverImageUrl={follow.creator.coverImageUrl}
                category={follow.creator.category}
                subscriptionPrice={follow.creator.subscriptionPrice}
                trialEnabled={follow.creator.trialEnabled}
                isVerified={follow.creator.isVerified}
                subscriberCount={follow.creator.stats.subscriberCount}
                contentCount={follow.creator.stats.contentCount}
                onUnfollow={() => handleUnfollow(follow.creator.id)}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
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
        </>
      )}
    </div>
  );
}
