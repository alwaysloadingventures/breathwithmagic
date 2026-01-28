import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getCache, setCache } from "@/lib/cache";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/lib/button-variants";
import {
  HeroSection,
  SocialProofBanner,
  SocialProofBannerSkeleton,
  CreatorCard,
  CreatorCardSkeleton,
} from "@/components/browse";
import { SkipLink } from "@/components/ui/skip-link";

/**
 * Homepage - Public landing page
 *
 * Features:
 * - Hero section with value proposition
 * - Social proof banner with platform stats
 * - Featured creators section
 * - CTA to explore all creators
 *
 * Uses ISR with 5-minute revalidation as per PRD.
 */
export const revalidate = 300; // 5 minutes

export default function HomePage() {
  return (
    <>
      <SkipLink />
      <main id="main-content" className="min-h-screen bg-background">
        {/* Hero Section */}
        <HeroSection />

      {/* Social Proof Section */}
      <Suspense fallback={<SocialProofBannerSkeleton />}>
        <SocialProofSection />
      </Suspense>

      {/* Featured Creators Section */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
                Featured creators
              </h2>
              <p className="text-muted-foreground mt-2">
                Discover teachers handpicked for their exceptional practices
              </p>
            </div>
            <Link
              href="/explore"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "hidden sm:flex",
              )}
            >
              View all
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </div>

          <Suspense fallback={<FeaturedCreatorsSkeleton />}>
            <FeaturedCreators />
          </Suspense>

          {/* Mobile CTA */}
          <div className="mt-8 sm:hidden">
            <Link
              href="/explore"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-full min-h-[44px] flex items-center justify-center",
              )}
            >
              View all creators
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
              Explore by practice
            </h2>
            <p className="text-muted-foreground mt-2">
              Find the modality that resonates with you
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {CATEGORIES.map((category) => (
              <Link
                key={category.value}
                href={`/explore?category=${category.value}`}
                className="group p-6 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all text-center"
              >
                <span className="text-3xl mb-3 block" aria-hidden="true">{category.icon}</span>
                <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                  {category.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-t from-accent/30 to-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
            Ready to start your practice?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of people who have found their favorite teachers on
            breathwithmagic. Start exploring today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/explore"
              className={cn(
                buttonVariants({ size: "lg" }),
                "min-h-[48px] px-8 text-base font-medium",
              )}
            >
              Explore creators
              <ArrowRight className="ml-2 size-4" />
            </Link>
            <Link
              href="/become-creator"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "min-h-[48px] px-8 text-base font-medium",
              )}
            >
              Share your practice
            </Link>
          </div>
        </div>
      </section>
      </main>
    </>
  );
}

/**
 * Social Proof Section - Async Server Component
 */
async function SocialProofSection() {
  // Get platform stats
  const [creatorCount, subscriptionData] = await Promise.all([
    prisma.creatorProfile.count({
      where: {
        status: "active",
        stripeOnboardingComplete: true,
      },
    }),
    prisma.subscription.aggregate({
      where: {
        status: { in: ["active", "trialing"] },
      },
      _sum: {
        priceAtPurchase: true,
      },
      _count: true,
    }),
  ]);

  // Calculate total earnings (simplified - actual would use Stripe data)
  // This shows monthly recurring revenue
  const totalEarnings = subscriptionData._sum.priceAtPurchase ?? 0;
  const subscriberCount = subscriptionData._count ?? 0;

  return (
    <SocialProofBanner
      creatorCount={creatorCount}
      totalEarnings={totalEarnings}
      subscriberCount={subscriberCount}
    />
  );
}

/**
 * Featured creators cache type
 * Uses Prisma enum types for category and subscriptionPrice
 */
import type { CreatorCategory, SubscriptionPriceTier } from "@prisma/client";

interface FeaturedCreator {
  id: string;
  handle: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  category: CreatorCategory;
  subscriptionPrice: SubscriptionPriceTier;
  trialEnabled: boolean;
  isVerified: boolean;
  _count: {
    subscriptions: number;
  };
}

/**
 * Featured Creators - Async Server Component
 *
 * Uses Redis caching to reduce database load on the homepage.
 * Cache TTL: 5 minutes (300 seconds) to match ISR revalidation.
 */
async function FeaturedCreators() {
  const CACHE_KEY = "homepage:featured";
  const CACHE_TTL = 300; // 5 minutes

  // Try to get from cache first
  const cached = await getCache<FeaturedCreator[]>(CACHE_KEY);

  let creators: FeaturedCreator[];

  if (cached) {
    creators = cached;
  } else {
    // Fetch from database
    creators = await prisma.creatorProfile.findMany({
      where: {
        isFeatured: true,
        status: "active",
        stripeOnboardingComplete: true,
      },
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
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    // Cache the result
    await setCache(CACHE_KEY, creators, CACHE_TTL);
  }

  if (creators.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No featured creators yet. Check back soon!</p>
        <Link href="/explore" className={cn(buttonVariants(), "mt-4")}>
          Browse all creators
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {creators.map((creator, index) => (
        <CreatorCard
          key={creator.id}
          handle={creator.handle}
          displayName={creator.displayName}
          bio={creator.bio}
          avatarUrl={creator.avatarUrl}
          coverImageUrl={creator.coverImageUrl}
          category={creator.category}
          subscriptionPrice={creator.subscriptionPrice}
          trialEnabled={creator.trialEnabled}
          isVerified={creator.isVerified}
          subscriberCount={creator._count.subscriptions}
          // Prioritize first 3 cards for LCP optimization (above the fold on desktop)
          priority={index < 3}
        />
      ))}
    </div>
  );
}

/**
 * Featured Creators Skeleton
 */
function FeaturedCreatorsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <CreatorCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Category data for exploration links
 */
const CATEGORIES = [
  { value: "Breathwork", label: "Breathwork", icon: "🌬️" },
  { value: "Yoga", label: "Yoga", icon: "🧘" },
  { value: "Meditation", label: "Meditation", icon: "🧘‍♀️" },
  { value: "SoundHealing", label: "Sound Healing", icon: "🔔" },
  { value: "Movement", label: "Movement", icon: "💃" },
  { value: "Mindfulness", label: "Mindfulness", icon: "🌿" },
  { value: "Coaching", label: "Coaching", icon: "💡" },
  { value: "Sleep", label: "Sleep", icon: "😴" },
  { value: "StressRelief", label: "Stress Relief", icon: "🌊" },
  { value: "Somatic", label: "Somatic", icon: "🫀" },
];
