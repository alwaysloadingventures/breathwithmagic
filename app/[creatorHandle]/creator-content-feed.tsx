"use client";

/**
 * CreatorContentFeed - Client component with pagination for creator profile
 *
 * Features:
 * - Infinite scroll with cursor-based pagination
 * - Shows free content to all, paid content blurred for non-subscribers
 */

import { useCallback, useEffect, useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { ContentType } from "@prisma/client";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/lib/button-variants";
import {
  ContentPreviewCard,
  ContentPreviewCardSkeleton,
} from "@/components/browse/content-preview-card";

interface ContentItem {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  type: ContentType;
  duration?: number | null;
  isFree: boolean;
  publishedAt: Date | null;
}

interface CreatorContentFeedProps {
  creatorId: string;
  creatorHandle: string;
  hasAccess: boolean;
  initialContent: ContentItem[];
  initialCursor: string | null;
  totalCount: number;
}

export function CreatorContentFeed({
  creatorId,
  creatorHandle,
  hasAccess,
  initialContent,
  initialCursor,
  totalCount,
}: CreatorContentFeedProps) {
  const [items, setItems] = useState<ContentItem[]>(initialContent);
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Count free vs paid
  const freeCount = items.filter((c) => c.isFree).length;
  const paidCount = items.length - freeCount;

  // Fetch more content
  const fetchMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("cursor", nextCursor);
      params.set("limit", "12");

      const response = await fetch(
        `/api/creators/${creatorId}/content?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch content");
      }

      const data = await response.json();
      setItems((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch {
      setError("Failed to load more content");
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor, isLoadingMore, creatorId]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !isLoadingMore) {
          fetchMore();
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
  }, [nextCursor, isLoadingMore, fetchMore]);

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No content yet. Check back soon!</p>
      </div>
    );
  }

  return (
    <>
      {/* Content count summary */}
      {!hasAccess && paidCount > 0 && (
        <p className="text-sm text-muted-foreground mb-4">
          Showing {freeCount} free post{freeCount !== 1 ? "s" : ""} and{" "}
          {paidCount} exclusive post{paidCount !== 1 ? "s" : ""}
          {totalCount > items.length && ` of ${totalCount} total`}
        </p>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <ContentPreviewCard
            key={item.id}
            id={item.id}
            creatorHandle={creatorHandle}
            title={item.title}
            description={item.description}
            thumbnailUrl={item.thumbnailUrl}
            type={item.type}
            duration={item.duration}
            isFree={item.isFree}
            hasAccess={hasAccess || item.isFree}
            publishedAt={item.publishedAt}
          />
        ))}
      </div>

      {/* Load More Trigger */}
      <div
        ref={loadMoreRef}
        className="h-16 flex items-center justify-center mt-6"
      >
        {isLoadingMore && (
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        )}
        {!nextCursor && items.length > 6 && (
          <p className="text-sm text-muted-foreground">
            That&apos;s all the content for now
          </p>
        )}
      </div>

      {/* Error loading more */}
      {error && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-2">{error}</p>
          <button
            onClick={fetchMore}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Try again
          </button>
        </div>
      )}
    </>
  );
}

/**
 * Skeleton for initial loading
 */
export function CreatorContentFeedSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <ContentPreviewCardSkeleton key={i} />
      ))}
    </div>
  );
}
