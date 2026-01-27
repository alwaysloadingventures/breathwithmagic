import { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { SubscriptionsClient } from "./subscriptions-client";
import { BillingPortalButton } from "./billing-portal-button";

export const metadata: Metadata = {
  title: "My Subscriptions | breathwithmagic",
  description: "Manage your subscriptions to wellness creators",
};

/**
 * SubscriptionsPage - Server component for the subscriptions page
 *
 * Handles authentication and initial data fetch.
 * Delegates to client component for interactivity.
 */
export default async function SubscriptionsPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in?redirect_url=/subscriptions");
  }

  // Get the user from our database
  const dbUser = await prisma.user.findUnique({
    where: { clerkId: user.id },
    select: {
      id: true,
      stripeCustomerId: true,
    },
  });

  if (!dbUser) {
    redirect("/sign-in");
  }

  // Fetch initial subscriptions
  const subscriptions = await prisma.subscription.findMany({
    where: { userId: dbUser.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      creator: {
        select: {
          id: true,
          handle: true,
          displayName: true,
          avatarUrl: true,
          category: true,
          subscriptionPrice: true,
        },
      },
    },
  });

  // Format subscriptions for the client
  const formattedSubscriptions = subscriptions.map((sub) => ({
    id: sub.id,
    status: sub.status,
    priceAtPurchase: sub.priceAtPurchase,
    currentPeriodStart: sub.currentPeriodStart?.toISOString() || null,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() || null,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    creator: {
      id: sub.creator.id,
      handle: sub.creator.handle,
      displayName: sub.creator.displayName,
      avatarUrl: sub.creator.avatarUrl,
      category: sub.creator.category,
      currentPrice: sub.creator.subscriptionPrice,
    },
  }));

  // Determine if user has a Stripe customer ID (for billing portal access)
  const hasBillingAccount = !!dbUser.stripeCustomerId;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/home"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Back to home"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                  aria-hidden="true"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-lg font-semibold text-foreground">
                My Subscriptions
              </h1>
            </div>
            {hasBillingAccount && <BillingPortalButton />}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {subscriptions.length === 0 ? (
          <EmptyState />
        ) : (
          <SubscriptionsClient initialSubscriptions={formattedSubscriptions} />
        )}
      </main>
    </div>
  );
}

/**
 * EmptyState - Shown when user has no subscriptions
 */
function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-8 h-8 text-muted-foreground"
          aria-hidden="true"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" x2="19" y1="8" y2="14" />
          <line x1="22" x2="16" y1="11" y2="11" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        No subscriptions yet
      </h2>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Discover amazing wellness creators and subscribe to access their
        exclusive content. You can cancel anytime from settings.
      </p>
      <Link href="/explore">
        <Button>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4 mr-1.5"
            aria-hidden="true"
            data-icon="inline-start"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" x2="16.65" y1="21" y2="16.65" />
          </svg>
          Explore creators
        </Button>
      </Link>
    </div>
  );
}
