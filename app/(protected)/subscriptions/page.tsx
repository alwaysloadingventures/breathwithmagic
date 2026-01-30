import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensure-user";
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
  // Ensure user exists in database (auto-creates if not)
  const userResult = await ensureUser();
  if (!userResult) {
    redirect("/sign-in?redirect_url=/subscriptions");
  }
  const dbUser = userResult.user;

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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">
          My Subscriptions
        </h1>
        {hasBillingAccount && <BillingPortalButton />}
      </div>

      {/* Content */}
      {subscriptions.length === 0 ? (
        <EmptyState />
      ) : (
        <SubscriptionsClient initialSubscriptions={formattedSubscriptions} />
      )}
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
