import { Compass, Settings, Heart, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/lib/button-variants";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state for home page
 */
export default function HomePageLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4 text-primary"
                  aria-hidden="true"
                >
                  <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" />
                  <path d="M17 4a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2" />
                </svg>
              </div>
              <span className="font-semibold text-foreground">
                breathwithmagic
              </span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <div
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "text-primary",
                )}
              >
                Feed
              </div>
              <div
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                <Compass className="size-4 mr-1" />
                Explore
              </div>
              <div
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                <Heart className="size-4 mr-1" />
                Following
              </div>
              <div
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                <Users className="size-4 mr-1" />
                Subscriptions
              </div>
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "hidden sm:flex",
                )}
              >
                <Settings className="size-5" />
              </div>
              <Skeleton className="w-10 h-10 rounded-full" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden gap-2 mb-6 overflow-x-auto pb-2">
          <Skeleton className="h-9 w-16 shrink-0" />
          <Skeleton className="h-9 w-24 shrink-0" />
          <Skeleton className="h-9 w-28 shrink-0" />
          <Skeleton className="h-9 w-32 shrink-0" />
        </div>

        {/* Feed Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border overflow-hidden"
            >
              <Skeleton className="aspect-video" />
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-5 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
