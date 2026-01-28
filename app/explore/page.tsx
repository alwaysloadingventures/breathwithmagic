import { Suspense } from "react";
import { Metadata } from "next";
import { CreatorCategory } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { CreatorCardSkeleton } from "@/components/browse";
import { ExplorePageClient } from "./explore-page-client";
import { SkipLink } from "@/components/ui/skip-link";

/**
 * Explore Page - Browse creators with filters
 *
 * Features:
 * - Grid of creator cards
 * - Category filter (pills)
 * - Search by creator name
 * - Cursor-based pagination (load more button)
 *
 * Uses ISR with 10-minute revalidation as per PRD.
 */
export const revalidate = 600; // 10 minutes

export const metadata: Metadata = {
  title: "Explore Creators | breathwithmagic",
  description:
    "Discover wellness creators in breathwork, yoga, meditation, and more. Find the teacher that resonates with your practice.",
};

interface ExplorePageProps {
  searchParams: Promise<{
    category?: string;
    q?: string;
  }>;
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const params = await searchParams;
  const category = params.category as CreatorCategory | undefined;
  const searchQuery = params.q;

  // Initial data fetch for SSR
  const initialData = await getInitialCreators(category, searchQuery);

  return (
    <>
      <SkipLink />
      <main id="main-content" className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 md:py-12">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-semibold text-foreground">
              Explore creators
            </h1>
            <p className="text-muted-foreground mt-2">
              Find teachers whose practice resonates with yours
            </p>
          </div>

          {/* Client-side interactive components */}
          <Suspense fallback={<ExplorePageSkeleton />}>
            <ExplorePageClient
              initialCreators={initialData.creators}
              initialNextCursor={initialData.nextCursor}
              initialCategory={category}
              initialSearchQuery={searchQuery}
              totalCount={initialData.totalCount}
            />
          </Suspense>
        </div>
      </main>
    </>
  );
}

/**
 * Fetch initial creators for SSR
 */
async function getInitialCreators(
  category?: CreatorCategory,
  searchQuery?: string,
) {
  const INITIAL_LIMIT = 12;

  // Build where clause
  const where: {
    status: "active";
    stripeOnboardingComplete: true;
    category?: CreatorCategory;
    OR?: Array<{
      displayName?: { contains: string; mode: "insensitive" };
      handle?: { contains: string; mode: "insensitive" };
      bio?: { contains: string; mode: "insensitive" };
    }>;
  } = {
    status: "active",
    stripeOnboardingComplete: true,
  };

  if (category) {
    where.category = category;
  }

  if (searchQuery) {
    where.OR = [
      { displayName: { contains: searchQuery, mode: "insensitive" } },
      { handle: { contains: searchQuery, mode: "insensitive" } },
      { bio: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

  // Get total count
  const totalCount = await prisma.creatorProfile.count({ where });

  // Fetch creators
  const creators = await prisma.creatorProfile.findMany({
    where,
    select: {
      id: true,
      handle: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      coverImageUrl: true,
      category: true,
      subscriptionPrice: true,
      trialEnabled: true,
      isVerified: true,
      isFeatured: true,
      _count: {
        select: {
          subscriptions: {
            where: {
              status: { in: ["active", "trialing"] },
            },
          },
        },
      },
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: INITIAL_LIMIT + 1,
  });

  // Determine next cursor
  let nextCursor: string | null = null;
  if (creators.length > INITIAL_LIMIT) {
    nextCursor = creators[INITIAL_LIMIT - 1].id;
    creators.pop();
  }

  return {
    creators: creators.map((c) => ({
      id: c.id,
      handle: c.handle,
      displayName: c.displayName,
      bio: c.bio,
      avatarUrl: c.avatarUrl,
      coverImageUrl: c.coverImageUrl,
      category: c.category,
      subscriptionPrice: c.subscriptionPrice,
      trialEnabled: c.trialEnabled,
      isVerified: c.isVerified,
      subscriberCount: c._count.subscriptions,
    })),
    nextCursor,
    totalCount,
  };
}

/**
 * Loading skeleton for explore page
 */
function ExplorePageSkeleton() {
  return (
    <div>
      {/* Filter skeleton */}
      <div className="flex flex-wrap gap-2 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 w-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <CreatorCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
