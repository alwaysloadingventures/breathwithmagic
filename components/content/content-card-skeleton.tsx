import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * ContentCardSkeleton - Loading skeleton for content cards
 *
 * Matches the layout of ContentFeedCard with aspect-ratio placeholders
 * for consistent loading states.
 *
 * Features:
 * - Aspect-ratio video placeholder
 * - Avatar and text skeletons
 * - Animated pulse effect
 *
 * Usage:
 * ```tsx
 * {isLoading ? (
 *   <ContentCardSkeleton />
 * ) : (
 *   <ContentFeedCard {...content} />
 * )}
 * ```
 */
export interface ContentCardSkeletonProps {
  /** Additional CSS classes */
  className?: string;
}

export function ContentCardSkeleton({ className }: ContentCardSkeletonProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Thumbnail placeholder with aspect-ratio */}
      <Skeleton className="aspect-video w-full" />

      <CardContent className="p-4">
        {/* Creator row */}
        <div className="flex items-center gap-3 mb-3">
          <Skeleton className="size-10 rounded-full shrink-0" />
          <div className="flex-1 min-w-0">
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>

        {/* Title */}
        <Skeleton className="h-5 w-full mb-2" />

        {/* Description */}
        <Skeleton className="h-4 w-3/4 mb-2" />

        {/* Meta row */}
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

/**
 * ContentCardSkeletonGrid - Grid of skeleton cards for loading states
 *
 * Use when loading a grid of content cards (e.g., home feed, explore page)
 *
 * @param count - Number of skeleton cards to show (default 6)
 */
export interface ContentCardSkeletonGridProps {
  /** Number of skeleton cards to render */
  count?: number;
  /** Additional CSS classes for the grid container */
  className?: string;
}

export function ContentCardSkeletonGrid({
  count = 6,
  className,
}: ContentCardSkeletonGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <ContentCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * ContentListSkeleton - Loading skeleton for content list view
 *
 * Horizontal card layout used in creator dashboard
 */
export function ContentListSkeleton() {
  return (
    <div className="flex gap-4 rounded-lg border border-border bg-card p-3">
      {/* Thumbnail */}
      <Skeleton className="aspect-video w-32 sm:w-40 shrink-0 rounded-md" />

      {/* Content */}
      <div className="flex flex-1 flex-col min-w-0">
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <div className="flex gap-2 mb-auto">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <Skeleton className="h-3 w-24 mt-2" />
      </div>
    </div>
  );
}

/**
 * ContentListSkeletonList - Multiple list skeletons
 */
export interface ContentListSkeletonListProps {
  count?: number;
  className?: string;
}

export function ContentListSkeletonList({
  count = 5,
  className,
}: ContentListSkeletonListProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <ContentListSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * VideoPlayerSkeleton - Loading skeleton for video player
 *
 * Shows aspect-ratio placeholder with centered play button indicator
 */
export function VideoPlayerSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative aspect-video w-full bg-muted rounded-lg overflow-hidden",
        className,
      )}
    >
      <Skeleton className="absolute inset-0" />
      {/* Play button placeholder */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Skeleton className="size-16 rounded-full" />
      </div>
    </div>
  );
}

/**
 * AudioPlayerSkeleton - Loading skeleton for audio player
 */
export function AudioPlayerSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "p-4 bg-muted/50 rounded-lg border border-border",
        className,
      )}
    >
      <div className="flex items-center gap-4">
        {/* Play button */}
        <Skeleton className="size-12 rounded-full shrink-0" />

        {/* Waveform/progress */}
        <div className="flex-1">
          <Skeleton className="h-2 w-full rounded-full mb-2" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-10" />
          </div>
        </div>

        {/* Volume */}
        <Skeleton className="size-8 rounded shrink-0" />
      </div>
    </div>
  );
}
