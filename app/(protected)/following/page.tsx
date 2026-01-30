import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Heart, Search } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensure-user";
import { Button } from "@/components/ui/button";
import { SkipLink } from "@/components/ui/skip-link";
import { FollowingClient } from "./following-client";

export const metadata: Metadata = {
  title: "Following | breathwithmagic",
  description: "Creators you follow on breathwithmagic",
};

/**
 * FollowingPage - Server component for the following list page
 *
 * Displays all creators the user follows with a clear distinction
 * between following (free content access) and subscribing (full access).
 */
export default async function FollowingPage() {
  // Ensure user exists in database (auto-creates if not)
  const userResult = await ensureUser();
  if (!userResult) {
    redirect("/sign-in?redirect_url=/following");
  }
  const dbUser = userResult.user;

  // Fetch initial follows with creator info
  const follows = await prisma.follow.findMany({
    where: {
      userId: dbUser.id,
      creator: { status: "active" },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      creator: {
        select: {
          id: true,
          handle: true,
          displayName: true,
          avatarUrl: true,
          coverImageUrl: true,
          bio: true,
          category: true,
          subscriptionPrice: true,
          trialEnabled: true,
          isVerified: true,
          _count: {
            select: {
              subscriptions: {
                where: { status: { in: ["active", "trialing"] } },
              },
              followers: true,
              content: {
                where: { status: "published" },
              },
            },
          },
        },
      },
    },
  });

  // Get total follow count for empty state check
  const totalFollows = await prisma.follow.count({
    where: {
      userId: dbUser.id,
      creator: { status: "active" },
    },
  });

  // Format follows for the client
  const formattedFollows = follows.map((follow) => ({
    followId: follow.id,
    followedAt: follow.createdAt.toISOString(),
    creator: {
      id: follow.creator.id,
      handle: follow.creator.handle,
      displayName: follow.creator.displayName,
      avatarUrl: follow.creator.avatarUrl,
      coverImageUrl: follow.creator.coverImageUrl,
      bio: follow.creator.bio,
      category: follow.creator.category,
      subscriptionPrice: follow.creator.subscriptionPrice,
      trialEnabled: follow.creator.trialEnabled,
      isVerified: follow.creator.isVerified,
      stats: {
        subscriberCount: follow.creator._count.subscriptions,
        followerCount: follow.creator._count.followers,
        contentCount: follow.creator._count.content,
      },
    },
  }));

  return (
    <>
      <SkipLink />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  Following
                </h1>
              </div>
              <Link href="/subscriptions">
                <Button variant="outline" size="sm">
                  My Subscriptions
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main
          id="main-content"
          className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        >
          {/* Info Banner */}
          <div className="mb-8 p-4 rounded-lg bg-muted/50 border border-border flex items-start gap-3">
            <Heart className="size-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-foreground font-medium">
                Following vs. Subscribing
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Following lets you see free content from creators. Subscribing
                unlocks everything, including exclusive posts, videos, and
                direct messaging.
              </p>
            </div>
          </div>

          {totalFollows === 0 ? (
            <EmptyState />
          ) : (
            <FollowingClient
              initialFollows={formattedFollows}
              totalCount={totalFollows}
            />
          )}
        </main>
      </div>
    </>
  );
}

/**
 * EmptyState - Shown when user doesn't follow anyone
 */
function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
        <Heart className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Not following anyone yet
      </h2>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Follow wellness creators to see their free content in your feed.
        Discover creators in breathwork, yoga, meditation, and more.
      </p>
      <Link href="/explore">
        <Button>
          <Search className="w-4 h-4 mr-1.5" aria-hidden="true" />
          Explore creators
        </Button>
      </Link>
    </div>
  );
}
