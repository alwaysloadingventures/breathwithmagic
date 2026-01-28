import { Suspense } from "react";
import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Compass, Settings, Heart, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/lib/button-variants";
import { Skeleton } from "@/components/ui/skeleton";
import { HomeFeed } from "./home-feed";

/**
 * Home Page - Unified feed for authenticated users
 *
 * Features:
 * - Content from subscribed creators (all content)
 * - Content from followed creators (free content only)
 * - Empty state with explore CTA
 * - Infinite scroll pagination
 */

export default async function HomePage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/home" className="flex items-center gap-3">
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
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/home"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "text-primary",
                )}
              >
                Feed
              </Link>
              <Link
                href="/explore"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                <Compass className="size-4 mr-1" />
                Explore
              </Link>
              <Link
                href="/following"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                <Heart className="size-4 mr-1" />
                Following
              </Link>
              <Link
                href="/subscriptions"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                <Users className="size-4 mr-1" />
                Subscriptions
              </Link>
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <Link
                href="/settings"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "hidden sm:flex",
                )}
                aria-label="Settings"
              >
                <Settings className="size-5" />
              </Link>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10",
                  },
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Welcome back, {user.firstName || "there"}
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s the latest from creators you follow and subscribe to
          </p>
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden gap-2 mb-6 overflow-x-auto pb-2">
          <Link
            href="/home"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "shrink-0",
            )}
          >
            Feed
          </Link>
          <Link
            href="/explore"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "shrink-0",
            )}
          >
            <Compass className="size-4 mr-1" />
            Explore
          </Link>
          <Link
            href="/following"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "shrink-0",
            )}
          >
            <Heart className="size-4 mr-1" />
            Following
          </Link>
          <Link
            href="/subscriptions"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "shrink-0",
            )}
          >
            <Users className="size-4 mr-1" />
            Subscriptions
          </Link>
        </div>

        {/* Feed */}
        <Suspense fallback={<FeedSkeleton />}>
          <HomeFeed />
        </Suspense>
      </main>
    </div>
  );
}

/**
 * Feed Skeleton for loading state
 */
function FeedSkeleton() {
  return (
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
  );
}
