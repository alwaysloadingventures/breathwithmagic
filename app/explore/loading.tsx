import { CreatorCardSkeleton } from "@/components/browse";

/**
 * Loading state for Explore page
 */
export default function ExploreLoading() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Page Header */}
        <div className="mb-8">
          <div className="h-10 w-64 bg-muted animate-pulse rounded" />
          <div className="h-5 w-80 bg-muted animate-pulse rounded mt-2" />
        </div>

        {/* Search skeleton */}
        <div className="mb-8">
          <div className="h-11 w-full max-w-md bg-muted animate-pulse rounded-lg" />
        </div>

        {/* Filter skeleton */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-24 bg-muted animate-pulse rounded-lg"
            />
          ))}
        </div>

        {/* Results count skeleton */}
        <div className="h-4 w-32 bg-muted animate-pulse rounded mb-8" />

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <CreatorCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </main>
  );
}
