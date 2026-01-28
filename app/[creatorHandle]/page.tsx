import { Suspense } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { CheckCircle2, Users, Video, Calendar, Heart } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { cn, formatCount } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/lib/button-variants";
import { CreatorProfileActions } from "./creator-profile-actions";
import {
  CreatorContentFeed,
  CreatorContentFeedSkeleton,
} from "./creator-content-feed";

/**
 * Creator Profile Page - Public profile for a creator
 *
 * Features:
 * - Avatar, cover image, display name, bio
 * - Category badge
 * - Subscription price and trial info
 * - Follow button (for logged-in users)
 * - Subscribe button with price
 * - Content preview: 2-3 free posts, blurred thumbnails for paid
 * - Content count
 */

interface CreatorProfilePageProps {
  params: Promise<{ creatorHandle: string }>;
}

/**
 * Price tier display values
 */
const PRICE_DISPLAY: Record<string, { amount: string; cents: number }> = {
  TIER_500: { amount: "$5", cents: 500 },
  TIER_1000: { amount: "$10", cents: 1000 },
  TIER_2000: { amount: "$20", cents: 2000 },
  TIER_3000: { amount: "$30", cents: 3000 },
};

/**
 * Category display labels
 */
const CATEGORY_LABELS: Record<string, string> = {
  Breathwork: "Breathwork",
  Yoga: "Yoga",
  Meditation: "Meditation",
  Mindfulness: "Mindfulness",
  Somatic: "Somatic",
  SoundHealing: "Sound Healing",
  Movement: "Movement",
  Coaching: "Coaching",
  Sleep: "Sleep",
  StressRelief: "Stress Relief",
};

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({
  params,
}: CreatorProfilePageProps): Promise<Metadata> {
  const { creatorHandle } = await params;

  const creator = await prisma.creatorProfile.findFirst({
    where: {
      handle: creatorHandle,
      status: "active",
    },
    select: {
      displayName: true,
      bio: true,
      avatarUrl: true,
      category: true,
    },
  });

  if (!creator) {
    return {
      title: "Creator Not Found | breathwithmagic",
    };
  }

  return {
    title: `${creator.displayName} | breathwithmagic`,
    description:
      creator.bio ??
      `${creator.displayName} is a ${CATEGORY_LABELS[creator.category]} creator on breathwithmagic.`,
    openGraph: {
      title: creator.displayName,
      description:
        creator.bio ?? `${CATEGORY_LABELS[creator.category]} creator`,
      images: creator.avatarUrl ? [creator.avatarUrl] : [],
    },
  };
}

export default async function CreatorProfilePage({
  params,
}: CreatorProfilePageProps) {
  const { creatorHandle } = await params;

  // Fetch creator data
  const creator = await prisma.creatorProfile.findFirst({
    where: {
      handle: creatorHandle,
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
      dmEnabled: true,
      isVerified: true,
      createdAt: true,
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
  });

  if (!creator) {
    notFound();
  }

  // Check if user is authenticated
  const { userId } = await auth();

  // Check subscription and follow status if authenticated
  let isSubscribed = false;
  let isFollowing = false;

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (user) {
      const [subscription, follow] = await Promise.all([
        prisma.subscription.findFirst({
          where: {
            userId: user.id,
            creatorId: creator.id,
            status: { in: ["active", "trialing"] },
          },
        }),
        prisma.follow.findFirst({
          where: {
            userId: user.id,
            creatorId: creator.id,
          },
        }),
      ]);

      isSubscribed = !!subscription;
      isFollowing = !!follow;
    }
  }

  const price = PRICE_DISPLAY[creator.subscriptionPrice];
  const initials = creator.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <main className="min-h-screen bg-background">
      {/* Cover Image */}
      <div className="relative h-48 md:h-64 lg:h-80 bg-muted overflow-hidden">
        {creator.coverImageUrl ? (
          <Image
            src={creator.coverImageUrl}
            alt={`${creator.displayName}'s cover`}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>

      <div className="container mx-auto px-4">
        {/* Profile Header */}
        <div className="relative -mt-20 md:-mt-24 mb-8">
          <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
            {/* Avatar */}
            <Avatar className="size-32 md:size-40 border-4 border-background ring-4 ring-border shadow-lg">
              {creator.avatarUrl ? (
                <AvatarImage
                  src={creator.avatarUrl}
                  alt={creator.displayName}
                />
              ) : null}
              <AvatarFallback className="text-3xl md:text-4xl">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Name and Stats */}
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
                  {creator.displayName}
                </h1>
                {creator.isVerified && (
                  <CheckCircle2
                    className="size-6 text-primary"
                    aria-label="Verified Creator"
                  />
                )}
              </div>
              <p className="text-muted-foreground">@{creator.handle}</p>

              {/* Stats Row */}
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                <Badge variant="secondary" className="font-normal">
                  {CATEGORY_LABELS[creator.category]}
                </Badge>
                <span className="flex items-center gap-1">
                  <Users className="size-4" />
                  {formatCount(creator._count.subscriptions)} subscriber
                  {creator._count.subscriptions !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="size-4" />
                  {formatCount(creator._count.followers)} follower
                  {creator._count.followers !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  <Video className="size-4" />
                  {creator._count.content} post
                  {creator._count.content !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="size-4" />
                  Joined{" "}
                  {new Date(creator.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            {/* Action Buttons - Desktop */}
            <div className="hidden md:block">
              <CreatorProfileActions
                creatorId={creator.id}
                creatorHandle={creator.handle}
                price={price.amount}
                trialEnabled={creator.trialEnabled}
                isAuthenticated={!!userId}
                isSubscribed={isSubscribed}
                isFollowing={isFollowing}
              />
            </div>
          </div>
        </div>

        {/* Mobile Action Buttons */}
        <div className="md:hidden mb-6">
          <CreatorProfileActions
            creatorId={creator.id}
            creatorHandle={creator.handle}
            price={price.amount}
            trialEnabled={creator.trialEnabled}
            isAuthenticated={!!userId}
            isSubscribed={isSubscribed}
            isFollowing={isFollowing}
          />
        </div>

        {/* Following vs Subscribing distinction */}
        {!isSubscribed && (
          <p className="text-sm text-muted-foreground mb-6 flex items-center gap-2">
            <Heart className="size-4 text-primary/70" />
            <span>
              Following lets you see free content. Subscribing unlocks
              everything.
            </span>
          </p>
        )}

        {/* Bio */}
        {creator.bio && (
          <div className="mb-8 max-w-2xl">
            <p className="text-foreground whitespace-pre-wrap">{creator.bio}</p>
          </div>
        )}

        {/* Subscription CTA Card */}
        {!isSubscribed && (
          <div className="mb-10 p-6 rounded-xl bg-muted/50 border border-border max-w-lg">
            <h3 className="font-semibold text-foreground mb-2">
              Subscribe for {price.amount}/month
            </h3>
            {creator.trialEnabled ? (
              <p className="text-muted-foreground text-sm mb-4">
                7 days free, then {price.amount}/month unless you cancel
              </p>
            ) : (
              <p className="text-muted-foreground text-sm mb-4">
                Get full access to all content
              </p>
            )}
            <ul className="space-y-2 mb-4 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="size-4 text-primary" />
                Access to {creator._count.content} exclusive posts
              </li>
              {creator.dmEnabled && (
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="size-4 text-primary" />
                  Direct messaging with {creator.displayName}
                </li>
              )}
              <li className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="size-4 text-primary" />
                Cancel anytime from settings
              </li>
            </ul>
            <Link
              href={
                userId
                  ? `/api/creators/${creator.id}/subscribe`
                  : `/sign-up?redirect_url=/${creator.handle}`
              }
              className={cn(buttonVariants(), "w-full min-h-[44px]")}
            >
              {creator.trialEnabled
                ? "Start free trial"
                : `Subscribe for ${price.amount}/month`}
            </Link>
          </div>
        )}

        {/* Content Section */}
        <section className="pb-16">
          <h2 className="text-xl font-semibold text-foreground mb-6">
            Content
          </h2>
          <Suspense fallback={<CreatorContentFeedSkeleton />}>
            <ContentGridWithPagination
              creatorId={creator.id}
              creatorHandle={creator.handle}
              hasAccess={isSubscribed}
            />
          </Suspense>
        </section>
      </div>
    </main>
  );
}

/**
 * Content Grid with Pagination - Server component wrapper
 */
async function ContentGridWithPagination({
  creatorId,
  creatorHandle,
  hasAccess,
}: {
  creatorId: string;
  creatorHandle: string;
  hasAccess: boolean;
}) {
  const INITIAL_LIMIT = 12;

  // Fetch initial content
  const content = await prisma.content.findMany({
    where: {
      creatorId,
      status: "published",
    },
    select: {
      id: true,
      title: true,
      description: true,
      thumbnailUrl: true,
      type: true,
      duration: true,
      isFree: true,
      publishedAt: true,
    },
    orderBy: [{ publishedAt: "desc" }],
    take: INITIAL_LIMIT + 1,
  });

  // Get total count
  const totalCount = await prisma.content.count({
    where: {
      creatorId,
      status: "published",
    },
  });

  // Determine if there are more results
  const hasMore = content.length > INITIAL_LIMIT;
  const items = hasMore ? content.slice(0, INITIAL_LIMIT) : content;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return (
    <CreatorContentFeed
      creatorId={creatorId}
      creatorHandle={creatorHandle}
      hasAccess={hasAccess}
      initialContent={items}
      initialCursor={nextCursor}
      totalCount={totalCount}
    />
  );
}
