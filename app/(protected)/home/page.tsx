import { Suspense } from "react";
import { redirect } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { PaymentRecoveryBanner } from "@/components/subscription/payment-recovery-banner";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensure-user";
import { HomeFeed } from "./home-feed";

/**
 * Home Page - Unified feed for authenticated users
 *
 * Features:
 * - Content from subscribed creators (all content)
 * - Content from followed creators (free content only)
 * - Empty state with explore CTA
 * - Infinite scroll pagination
 * - Mobile-optimized with bottom navigation in layout
 */

export default async function HomePage() {
  // Ensure user exists in database (auto-creates if not)
  const userResult = await ensureUser();
  if (!userResult) {
    redirect("/sign-in");
  }
  const dbUser = userResult.user;

  // Check for past_due subscriptions to show payment recovery banner
  let hasPastDueSubscription = false;
  let pastDueCreatorName: string | undefined;

  {
    const pastDueSubscription = await prisma.subscription.findFirst({
      where: {
        userId: dbUser.id,
        status: "past_due",
      },
      select: {
        creator: {
          select: { displayName: true },
        },
      },
    });

    if (pastDueSubscription) {
      hasPastDueSubscription = true;
      pastDueCreatorName = pastDueSubscription.creator.displayName;
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Payment Recovery Banner for past_due subscriptions */}
      {hasPastDueSubscription && (
        <PaymentRecoveryBanner
          creatorName={pastDueCreatorName}
          className="mb-6"
        />
      )}

      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-1">
          Welcome back, {dbUser.name?.split(" ")[0] || "there"}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s the latest from creators you follow and subscribe to
        </p>
      </div>

      {/* Feed */}
      <Suspense fallback={<FeedSkeleton />}>
        <HomeFeed />
      </Suspense>
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
