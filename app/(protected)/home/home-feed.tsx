"use client";

/**
 * HomeFeed - Client component for the unified home feed
 *
 * Features:
 * - Infinite scroll with cursor-based pagination
 * - Content from subscribed and followed creators
 * - Empty state with explore CTA
 */

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Loader2, Compass, Heart } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/lib/button-variants";
import {
  ContentFeedCard,
  ContentFeedCardSkeleton,
} from "@/components/content/content-feed-card";

interface FeedItem {
  id: string;
  type: "video" | "audio" | "text";
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  duration?: number | null;
  isFree: boolean;
  hasAccess: boolean;
  publishedAt?: string | null;
  creator: {
    id: string;
    handle: string;
    displayName: string;
    avatarUrl?: string | null;
    category: string;
  };
}

interface FeedResponse {
  items: FeedItem[];
  nextCursor: string | null;
  isEmpty: boolean;
}

export function HomeFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch feed data
  const fetchFeed = useCallback(async (cursor?: string) => {
    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      if (cursor) {
        params.set("cursor", cursor);
      }

      const response = await fetch(`/api/feed?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch feed");
      }

      const data: FeedResponse = await response.json();
      return data;
    } catch (err) {
      console.error("Feed fetch error:", err);
      throw err;
    }
  }, []);

  // Initial load
  useEffect(() => {
    let mounted = true;

    async function loadInitial() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchFeed();
        if (mounted) {
          setItems(data.items);
          setNextCursor(data.nextCursor);
          setIsEmpty(data.isEmpty);
        }
      } catch {
        if (mounted) {
          setError("Failed to load your feed. Please try again.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitial();

    return () => {
      mounted = false;
    };
  }, [fetchFeed]);

  // Load more function
  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const data = await fetchFeed(nextCursor);
      setItems((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch {
      setError("Failed to load more content.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor, isLoadingMore, fetchFeed]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [nextCursor, isLoadingMore, loadMore]);

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <ContentFeedCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Error state
  if (error && items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Try again
        </button>
      </div>
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
          <Heart className="size-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Your feed is empty
        </h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Follow creators to see their free content, or subscribe to unlock
          everything they share.
        </p>
        <Link href="/explore" className={cn(buttonVariants())}>
          <Compass className="size-4 mr-2" />
          Explore creators
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Feed Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <ContentFeedCard
            key={item.id}
            id={item.id}
            type={item.type}
            title={item.title}
            description={item.description}
            thumbnailUrl={item.thumbnailUrl}
            duration={item.duration}
            isFree={item.isFree}
            hasAccess={item.hasAccess}
            publishedAt={item.publishedAt}
            creator={item.creator}
          />
        ))}
      </div>

      {/* Load More Trigger */}
      <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
        {isLoadingMore && (
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        )}
        {!nextCursor && items.length > 0 && (
          <p className="text-sm text-muted-foreground">
            You&apos;re all caught up!
          </p>
        )}
      </div>

      {/* Error loading more */}
      {error && items.length > 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-2">{error}</p>
          <button
            onClick={loadMore}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Try again
          </button>
        </div>
      )}
    </>
  );
}
