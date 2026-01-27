import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state for Creator Profile page
 */
export default function CreatorProfileLoading() {
  return (
    <main className="min-h-screen bg-background">
      {/* Cover Image */}
      <div className="h-48 md:h-64 lg:h-80 bg-muted animate-pulse" />

      <div className="container mx-auto px-4">
        {/* Profile Header */}
        <div className="relative -mt-20 md:-mt-24 mb-8">
          <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
            {/* Avatar */}
            <Skeleton className="size-32 md:size-40 rounded-full border-4 border-background" />

            {/* Name and Stats */}
            <div className="flex-1 pb-2">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-32 mb-3" />

              <div className="flex flex-wrap items-center gap-4 mt-3">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>

            {/* Action Buttons - Desktop */}
            <div className="hidden md:flex items-center gap-3">
              <Skeleton className="h-11 w-28" />
              <Skeleton className="h-11 w-36" />
            </div>
          </div>
        </div>

        {/* Mobile Action Buttons */}
        <div className="md:hidden flex gap-3 mb-6">
          <Skeleton className="h-11 w-28" />
          <Skeleton className="h-11 flex-1" />
        </div>

        {/* Bio */}
        <div className="mb-8 max-w-2xl space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>

        {/* Subscription CTA Card */}
        <div className="mb-10 p-6 rounded-xl bg-muted/50 border border-border max-w-lg">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64 mb-4" />
          <div className="space-y-2 mb-4">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-52" />
          </div>
          <Skeleton className="h-11 w-full" />
        </div>

        {/* Content Section */}
        <section className="pb-16">
          <Skeleton className="h-7 w-24 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border overflow-hidden"
              >
                <Skeleton className="aspect-video" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
