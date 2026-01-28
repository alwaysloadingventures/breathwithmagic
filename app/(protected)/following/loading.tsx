import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state for the Following page
 */
export default function FollowingLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Skeleton className="w-5 h-5 rounded" />
              <Skeleton className="w-24 h-6 rounded" />
            </div>
            <Skeleton className="w-32 h-9 rounded" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner Skeleton */}
        <div className="mb-8 p-4 rounded-lg bg-muted/50 border border-border">
          <Skeleton className="w-full h-4 rounded mb-2" />
          <Skeleton className="w-3/4 h-4 rounded" />
        </div>

        {/* Count Skeleton */}
        <Skeleton className="w-32 h-4 rounded mb-6" />

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-border overflow-hidden"
            >
              <Skeleton className="aspect-[16/9] w-full" />
              <div className="p-4 pt-0 -mt-6 relative">
                <div className="flex items-end gap-3 mb-3">
                  <Skeleton className="size-14 rounded-full border-4 border-card" />
                </div>
                <Skeleton className="h-5 w-32 rounded" />
                <Skeleton className="h-4 w-20 rounded mt-1" />
                <Skeleton className="h-4 w-full rounded mt-2" />
                <Skeleton className="h-4 w-2/3 rounded mt-1" />
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <Skeleton className="h-5 w-20 rounded" />
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-24 rounded" />
                    <Skeleton className="h-9 w-20 rounded" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
