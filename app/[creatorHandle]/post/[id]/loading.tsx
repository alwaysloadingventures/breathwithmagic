import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/lib/button-variants";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state for individual content page
 */
export default function ContentPageLoading() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <div
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "gap-2 pointer-events-none",
            )}
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Back</span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Player Skeleton */}
            <Skeleton className="aspect-video rounded-lg" />

            {/* Content Info Skeleton */}
            <div className="mt-6">
              <Skeleton className="h-8 w-3/4 mb-2" />
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Creator Card Skeleton */}
            <div className="p-4 rounded-xl border border-border bg-card mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="size-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <Skeleton className="h-6 w-24 mb-3" />
              <div className="mt-4 pt-4 border-t border-border">
                <Skeleton className="h-4 w-full mb-3" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>

            {/* Related Content Skeleton */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <Skeleton className="h-5 w-40" />
              </div>
              <div className="divide-y divide-border">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3 p-3">
                    <Skeleton className="w-24 aspect-video rounded-md" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
