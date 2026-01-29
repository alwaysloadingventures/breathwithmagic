import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * CreatorCardSkeleton - Loading skeleton for creator cards
 *
 * Matches the layout of creator cards on explore page
 * with aspect-ratio placeholders for consistent loading states.
 *
 * Features:
 * - Cover image placeholder
 * - Avatar placeholder
 * - Text content skeletons
 * - Animated pulse effect
 */
export interface CreatorCardSkeletonProps {
  /** Additional CSS classes */
  className?: string;
}

export function CreatorCardSkeleton({ className }: CreatorCardSkeletonProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Cover image placeholder */}
      <Skeleton className="aspect-[3/1] w-full" />

      <CardContent className="p-4 pt-0 relative">
        {/* Avatar - overlapping cover image */}
        <div className="-mt-8 mb-3 flex justify-center">
          <Skeleton className="size-16 rounded-full border-4 border-card" />
        </div>

        {/* Name */}
        <div className="text-center mb-2">
          <Skeleton className="h-5 w-32 mx-auto mb-1" />
          <Skeleton className="h-4 w-24 mx-auto" />
        </div>

        {/* Category badge */}
        <div className="flex justify-center mb-3">
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>

        {/* Bio */}
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4 mx-auto mb-4" />

        {/* Price/CTA */}
        <Skeleton className="h-10 w-full rounded-md" />
      </CardContent>
    </Card>
  );
}

/**
 * CreatorCardSkeletonGrid - Grid of creator skeletons for loading states
 *
 * Use when loading a grid of creator cards (e.g., explore page)
 *
 * @param count - Number of skeleton cards to show (default 6)
 */
export interface CreatorCardSkeletonGridProps {
  /** Number of skeleton cards to render */
  count?: number;
  /** Additional CSS classes for the grid container */
  className?: string;
}

export function CreatorCardSkeletonGrid({
  count = 6,
  className,
}: CreatorCardSkeletonGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CreatorCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * CreatorProfileSkeleton - Loading skeleton for full creator profile page
 *
 * Used when loading a creator's profile page header
 */
export function CreatorProfileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("w-full", className)}>
      {/* Cover image */}
      <Skeleton className="aspect-[4/1] w-full rounded-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Avatar and basic info */}
        <div className="relative -mt-12 sm:-mt-16 flex flex-col sm:flex-row sm:items-end gap-4 pb-6">
          <Skeleton className="size-24 sm:size-32 rounded-full border-4 border-card shrink-0" />

          <div className="flex-1 min-w-0 pt-2">
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-4 w-32 mb-3" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>

          {/* Subscribe button */}
          <Skeleton className="h-11 w-40 rounded-md shrink-0" />
        </div>

        {/* Bio */}
        <div className="py-4 border-t border-border">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-4/5 mb-2" />
          <Skeleton className="h-4 w-3/5" />
        </div>

        {/* Stats */}
        <div className="flex gap-6 py-4 border-t border-border">
          <div>
            <Skeleton className="h-6 w-12 mb-1" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div>
            <Skeleton className="h-6 w-12 mb-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * CreatorListItemSkeleton - Skeleton for creator list items
 *
 * Used in following/subscription lists
 */
export function CreatorListItemSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 border border-border rounded-lg",
        className,
      )}
    >
      <Skeleton className="size-12 rounded-full shrink-0" />
      <div className="flex-1 min-w-0">
        <Skeleton className="h-4 w-32 mb-1" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-9 w-24 rounded-md shrink-0" />
    </div>
  );
}

/**
 * CreatorListSkeleton - List of creator item skeletons
 */
export interface CreatorListSkeletonProps {
  count?: number;
  className?: string;
}

export function CreatorListSkeleton({
  count = 5,
  className,
}: CreatorListSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CreatorListItemSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * FeaturedCreatorSkeleton - Skeleton for featured creator card (larger format)
 *
 * Used on homepage for hero creator cards
 */
export function FeaturedCreatorSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Large cover image */}
      <Skeleton className="aspect-[2/1] w-full" />

      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="size-16 rounded-full shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
        <Skeleton className="h-11 w-full mt-4 rounded-md" />
      </CardContent>
    </Card>
  );
}
