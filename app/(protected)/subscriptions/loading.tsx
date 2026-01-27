import { Skeleton } from "@/components/ui/skeleton";
import { SubscriptionCardSkeleton } from "@/components/subscription";

/**
 * Loading state for the subscriptions page
 */
export default function SubscriptionsLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Skeleton className="w-5 h-5 rounded" />
              <Skeleton className="w-32 h-6 rounded" />
            </div>
            <Skeleton className="w-28 h-8 rounded" />
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Tabs Skeleton */}
        <div className="flex items-center gap-2 pb-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="w-20 h-8 rounded-lg" />
          ))}
        </div>

        {/* Subscription Cards Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <SubscriptionCardSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}
