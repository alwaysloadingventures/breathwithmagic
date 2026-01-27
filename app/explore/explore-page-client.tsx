"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreatorCategory, SubscriptionPriceTier } from "@prisma/client";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CreatorCard,
  CreatorCardSkeleton,
  CategoryFilter,
  SearchInput,
} from "@/components/browse";

interface Creator {
  id: string;
  handle: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  category: CreatorCategory;
  subscriptionPrice: SubscriptionPriceTier;
  trialEnabled: boolean;
  isVerified: boolean;
  subscriberCount: number;
}

interface ExplorePageClientProps {
  initialCreators: Creator[];
  initialNextCursor: string | null;
  initialCategory?: CreatorCategory;
  initialSearchQuery?: string;
  totalCount: number;
}

/**
 * ExplorePageClient - Client-side interactive components for explore page
 *
 * Handles:
 * - Category filtering
 * - Search input
 * - Load more pagination
 * - URL state synchronization
 */
export function ExplorePageClient({
  initialCreators,
  initialNextCursor,
  initialCategory,
  initialSearchQuery,
  totalCount,
}: ExplorePageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Local state
  const [creators, setCreators] = useState<Creator[]>(initialCreators);
  const [nextCursor, setNextCursor] = useState<string | null>(
    initialNextCursor,
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery ?? "");
  const [selectedCategory, setSelectedCategory] = useState<
    CreatorCategory | "all"
  >(initialCategory ?? "all");

  /**
   * Update URL with new filters
   */
  const updateFilters = useCallback(
    (category: CreatorCategory | "all", query: string) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());

        if (category !== "all") {
          params.set("category", category);
        } else {
          params.delete("category");
        }

        if (query) {
          params.set("q", query);
        } else {
          params.delete("q");
        }

        const newUrl = params.toString()
          ? `/explore?${params.toString()}`
          : "/explore";
        router.push(newUrl);
      });
    },
    [router, searchParams],
  );

  /**
   * Handle category change
   */
  const handleCategoryChange = useCallback(
    (category: CreatorCategory | "all") => {
      setSelectedCategory(category);
      setCreators([]);
      setNextCursor(null);
      updateFilters(category, searchQuery);
    },
    [searchQuery, updateFilters],
  );

  /**
   * Handle search change (debounced from SearchInput)
   */
  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      setCreators([]);
      setNextCursor(null);
      updateFilters(selectedCategory, query);
    },
    [selectedCategory, updateFilters],
  );

  /**
   * Load more creators
   */
  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);

    try {
      const params = new URLSearchParams();
      params.set("limit", "12");
      params.set("cursor", nextCursor);

      if (selectedCategory !== "all") {
        params.set("category", selectedCategory);
      }

      // Note: Search is handled server-side on page reload
      // For client-side pagination, we use the API

      const response = await fetch(`/api/creators?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch creators");
      }

      const data = await response.json();

      setCreators((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch (error) {
      console.error("Error loading more creators:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor, isLoadingMore, selectedCategory]);

  // Determine display state
  const showCreators = creators.length > 0 || isPending;
  const showEmptyState = !isPending && creators.length === 0;
  const showLoadMore = nextCursor && !isLoadingMore;

  return (
    <div>
      {/* Filters Section */}
      <div className="space-y-4 mb-8">
        {/* Search Input */}
        <SearchInput
          value={searchQuery}
          onSearch={handleSearchChange}
          placeholder="Search creators by name..."
          className="max-w-md"
        />

        {/* Category Filter */}
        <CategoryFilter
          selected={selectedCategory}
          onSelect={handleCategoryChange}
        />

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          {isPending ? (
            "Searching..."
          ) : (
            <>
              {totalCount} creator{totalCount !== 1 ? "s" : ""} found
              {selectedCategory !== "all" && <> in {selectedCategory}</>}
              {searchQuery && <> matching &quot;{searchQuery}&quot;</>}
            </>
          )}
        </p>
      </div>

      {/* Creators Grid */}
      {showCreators && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isPending
            ? // Show skeletons while transitioning
              Array.from({ length: 12 }).map((_, i) => (
                <CreatorCardSkeleton key={`skeleton-${i}`} />
              ))
            : creators.map((creator) => (
                <CreatorCard
                  key={creator.id}
                  handle={creator.handle}
                  displayName={creator.displayName}
                  bio={creator.bio}
                  avatarUrl={creator.avatarUrl}
                  coverImageUrl={creator.coverImageUrl}
                  category={creator.category}
                  subscriptionPrice={creator.subscriptionPrice}
                  trialEnabled={creator.trialEnabled}
                  isVerified={creator.isVerified}
                  subscriberCount={creator.subscriberCount}
                />
              ))}
        </div>
      )}

      {/* Empty State */}
      {showEmptyState && (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-medium text-foreground mb-2">
              No creators found
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? `We couldn't find any creators matching "${searchQuery}".`
                : selectedCategory !== "all"
                  ? `We don't have any ${selectedCategory} creators yet.`
                  : "No creators are available at the moment."}
            </p>
            {(searchQuery || selectedCategory !== "all") && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  updateFilters("all", "");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Load More Button */}
      {showLoadMore && (
        <div className="flex justify-center mt-12">
          <Button
            variant="outline"
            size="lg"
            onClick={handleLoadMore}
            className="min-h-[48px] px-8"
          >
            Load more creators
          </Button>
        </div>
      )}

      {/* Loading More Indicator */}
      {isLoadingMore && (
        <div className="flex justify-center mt-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span>Loading more...</span>
          </div>
        </div>
      )}
    </div>
  );
}
