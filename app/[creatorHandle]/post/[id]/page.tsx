import { Suspense } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Play,
  Music,
  FileText,
  CheckCircle2,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/lib/button-variants";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentViewClient } from "./content-view-client";

/**
 * Individual Content Page
 *
 * Features:
 * - Full content view for accessible content
 * - Video player for video content
 * - Audio player for audio content
 * - Text display for text posts
 * - Related content suggestions
 * - Paywall overlay for non-subscribers
 */

interface ContentPageProps {
  params: Promise<{ creatorHandle: string; id: string }>;
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
 * Format duration in seconds to human-readable string
 */
function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Generate metadata for SEO
 *
 * Provides rich metadata for content pages including:
 * - Dynamic title with content and creator name
 * - Description from content (truncated to 160 chars for SEO)
 * - Open Graph tags with video/audio specific metadata
 * - Twitter card for X/Twitter sharing
 * - Canonical URL
 */
export async function generateMetadata({
  params,
}: ContentPageProps): Promise<Metadata> {
  const { creatorHandle, id } = await params;

  const content = await prisma.content.findUnique({
    where: { id },
    select: {
      title: true,
      description: true,
      thumbnailUrl: true,
      type: true,
      duration: true,
      isFree: true,
      publishedAt: true,
      creator: {
        select: {
          displayName: true,
          handle: true,
          avatarUrl: true,
          category: true,
        },
      },
    },
  });

  if (!content || content.creator.handle !== creatorHandle) {
    return {
      title: "Content Not Found",
      description: "This content could not be found on breathwithmagic.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  // Create SEO-optimized description (max 160 chars)
  const categoryLabel = CATEGORY_LABELS[content.creator.category];
  const defaultDescription = `${content.title} - A ${content.type} by ${content.creator.displayName} on breathwithmagic. ${categoryLabel} content for your wellness practice.`;
  const contentDescription = content.description
    ? content.description.length > 160
      ? `${content.description.slice(0, 157)}...`
      : content.description
    : defaultDescription;

  // Determine the best image for sharing
  const ogImage = content.thumbnailUrl || content.creator.avatarUrl;

  // Base Open Graph configuration
  const openGraphBase = {
    title: content.title,
    description: contentDescription,
    url: `/${creatorHandle}/post/${id}`,
    siteName: "breathwithmagic",
    locale: "en_US",
    images: ogImage
      ? [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: `${content.title} by ${content.creator.displayName}`,
          },
        ]
      : [
          {
            url: "/opengraph-image",
            width: 1200,
            height: 630,
            alt: "breathwithmagic - Creator-First Wellness Platform",
          },
        ],
  };

  // Build type-specific Open Graph metadata
  let openGraph: Metadata["openGraph"];

  if (content.type === "video") {
    openGraph = {
      ...openGraphBase,
      type: "video.other",
      videos: content.thumbnailUrl
        ? [
            {
              url: content.thumbnailUrl,
              width: 1280,
              height: 720,
            },
          ]
        : undefined,
    };
  } else if (content.type === "audio") {
    openGraph = {
      ...openGraphBase,
      type: "music.song",
      audio: content.thumbnailUrl
        ? [
            {
              url: content.thumbnailUrl,
            },
          ]
        : undefined,
    };
  } else {
    openGraph = {
      ...openGraphBase,
      type: "article",
      publishedTime: content.publishedAt?.toISOString(),
      authors: [content.creator.displayName],
      tags: [categoryLabel, "wellness", "breathwithmagic"],
    };
  }

  // Determine Twitter card type based on content type
  const twitterCard =
    content.type === "video" ? "player" : "summary_large_image";

  return {
    title: `${content.title} by ${content.creator.displayName}`,
    description: contentDescription,
    keywords: [
      content.title,
      content.creator.displayName,
      categoryLabel.toLowerCase(),
      content.type,
      "wellness",
      "breathwithmagic",
    ],
    openGraph,
    twitter: {
      card: twitterCard,
      title: `${content.title} by ${content.creator.displayName}`,
      description: contentDescription,
      images: ogImage ? [ogImage] : ["/opengraph-image"],
      creator: "@breathwithmagic",
    },
    alternates: {
      canonical: `/${creatorHandle}/post/${id}`,
    },
    other: {
      // Additional structured data hints
      ...(content.duration && {
        "video:duration": String(content.duration),
      }),
      "article:author": content.creator.displayName,
      "article:section": categoryLabel,
    },
  };
}

export default async function ContentPage({ params }: ContentPageProps) {
  const { creatorHandle, id } = await params;

  // Fetch content with creator info
  const content = await prisma.content.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true,
          handle: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          category: true,
          subscriptionPrice: true,
          trialEnabled: true,
          dmEnabled: true,
          isVerified: true,
          status: true,
        },
      },
      program: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  // Validate content exists and handle matches
  if (
    !content ||
    content.creator.handle !== creatorHandle ||
    content.status !== "published" ||
    content.creator.status !== "active"
  ) {
    notFound();
  }

  // Check if user is authenticated
  const { userId: clerkId } = await auth();

  // Determine access level
  let hasAccess = content.isFree;
  let isSubscribed = false;
  let watchProgress = 0;

  if (clerkId) {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (user) {
      // Check subscription status
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId: user.id,
          creatorId: content.creatorId,
          status: { in: ["active", "trialing"] },
        },
      });
      isSubscribed = !!subscription;

      // Get watch progress if user has access
      hasAccess = content.isFree || isSubscribed;

      if (hasAccess) {
        const view = await prisma.contentView.findFirst({
          where: {
            userId: user.id,
            contentId: content.id,
          },
          orderBy: { createdAt: "desc" },
          select: { watchDuration: true },
        });
        watchProgress = view?.watchDuration || 0;
      }
    }
  }

  const price = PRICE_DISPLAY[content.creator.subscriptionPrice];
  const creatorInitials = content.creator.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Type icon
  const TypeIcon = {
    video: Play,
    audio: Music,
    text: FileText,
  }[content.type];

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link
            href={`/${creatorHandle}`}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "gap-2",
            )}
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">
              Back to {content.creator.displayName}
            </span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Content Player/Display */}
            <ContentViewClient
              contentId={content.id}
              type={content.type}
              title={content.title}
              description={content.description}
              mediaUrl={content.mediaUrl}
              thumbnailUrl={content.thumbnailUrl}
              duration={content.duration}
              hasAccess={hasAccess}
              isAuthenticated={!!clerkId}
              creatorHandle={content.creator.handle}
              creatorName={content.creator.displayName}
              price={price.amount}
              trialEnabled={content.creator.trialEnabled}
              initialPosition={watchProgress}
            />

            {/* Content Info */}
            <div className="mt-6">
              {/* Title */}
              <h1 className="text-2xl font-semibold text-foreground mb-2">
                {content.title}
              </h1>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
                <Badge variant="secondary" className="capitalize">
                  <TypeIcon className="size-3 mr-1" />
                  {content.type}
                </Badge>
                {content.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="size-4" />
                    {formatDuration(content.duration)}
                  </span>
                )}
                {content.publishedAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="size-4" />
                    {new Date(content.publishedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
                {content.isFree && (
                  <Badge className="bg-primary text-primary-foreground">
                    Free
                  </Badge>
                )}
              </div>

              {/* Program Link */}
              {content.program && (
                <p className="text-sm text-muted-foreground mb-4">
                  Part of{" "}
                  <Link
                    href={`/${creatorHandle}?program=${content.program.id}`}
                    className="text-primary hover:underline"
                  >
                    {content.program.title}
                  </Link>
                </p>
              )}

              {/* Description */}
              {content.description && hasAccess && (
                <div className="prose prose-sm max-w-none text-foreground">
                  <p className="whitespace-pre-wrap">{content.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Creator Card */}
            <div className="p-4 rounded-xl border border-border bg-card mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Link href={`/${creatorHandle}`}>
                  <Avatar className="size-12">
                    {content.creator.avatarUrl && (
                      <AvatarImage
                        src={content.creator.avatarUrl}
                        alt={content.creator.displayName}
                      />
                    )}
                    <AvatarFallback>{creatorInitials}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/${creatorHandle}`}
                    className="flex items-center gap-1 font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {content.creator.displayName}
                    {content.creator.isVerified && (
                      <CheckCircle2 className="size-4 text-primary" />
                    )}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    @{content.creator.handle}
                  </p>
                </div>
              </div>

              <Badge variant="secondary" className="mb-3">
                {CATEGORY_LABELS[content.creator.category]}
              </Badge>

              {/* Subscribe CTA (if not subscribed) */}
              {!isSubscribed && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-3">
                    Subscribe to unlock all content from{" "}
                    {content.creator.displayName}
                  </p>
                  <Link
                    href={
                      clerkId
                        ? `/${creatorHandle}?subscribe=true`
                        : `/sign-up?redirect_url=/${creatorHandle}`
                    }
                    className={cn(buttonVariants(), "w-full")}
                  >
                    {content.creator.trialEnabled
                      ? "Start free trial"
                      : `Subscribe ${price.amount}/month`}
                  </Link>
                  {content.creator.trialEnabled && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      7 days free, then {price.amount}/month
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Related Content */}
            <Suspense fallback={<RelatedContentSkeleton />}>
              <RelatedContentSection
                contentId={content.id}
                creatorId={content.creatorId}
                creatorHandle={creatorHandle}
                isSubscribed={isSubscribed}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * Related Content Section
 */
async function RelatedContentSection({
  contentId,
  creatorId,
  creatorHandle,
  isSubscribed,
}: {
  contentId: string;
  creatorId: string;
  creatorHandle: string;
  isSubscribed: boolean;
}) {
  // Fetch related content from the same creator
  const relatedContent = await prisma.content.findMany({
    where: {
      creatorId,
      id: { not: contentId },
      status: "published",
    },
    select: {
      id: true,
      type: true,
      title: true,
      thumbnailUrl: true,
      duration: true,
      isFree: true,
    },
    orderBy: { publishedAt: "desc" },
    take: 5,
  });

  if (relatedContent.length === 0) {
    return null;
  }

  const TypeIcons = {
    video: Play,
    audio: Music,
    text: FileText,
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-medium text-foreground">More from this creator</h3>
      </div>
      <div className="divide-y divide-border">
        {relatedContent.map((item) => {
          const itemHasAccess = item.isFree || isSubscribed;
          const ItemIcon = TypeIcons[item.type];

          return (
            <Link
              key={item.id}
              href={
                itemHasAccess
                  ? `/${creatorHandle}/post/${item.id}`
                  : `/${creatorHandle}`
              }
              className={cn(
                "flex gap-3 p-3",
                itemHasAccess && "hover:bg-muted/50 transition-colors",
              )}
            >
              {/* Thumbnail */}
              <div className="relative w-24 aspect-video rounded-md overflow-hidden bg-muted shrink-0">
                {item.thumbnailUrl ? (
                  <>
                    <Image
                      src={item.thumbnailUrl}
                      alt={item.title}
                      fill
                      className={cn(
                        "object-cover",
                        !itemHasAccess && "blur-sm scale-105",
                      )}
                      sizes="96px"
                    />
                    {!itemHasAccess && (
                      <div className="absolute inset-0 bg-background/30 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="p-1 rounded-full bg-background/80">
                          <Play className="size-3" />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-accent/30">
                    <ItemIcon className="size-5 text-muted-foreground/50" />
                  </div>
                )}
                {item.duration && itemHasAccess && (
                  <span className="absolute bottom-1 right-1 text-[10px] bg-background/90 px-1 rounded">
                    {formatDuration(item.duration)}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground line-clamp-2">
                  {item.title}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                  >
                    {item.type}
                  </Badge>
                  {item.isFree && (
                    <Badge className="text-[10px] px-1.5 py-0 bg-primary text-primary-foreground">
                      Free
                    </Badge>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Related Content Skeleton
 */
function RelatedContentSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-3">
            <Skeleton className="w-24 aspect-video rounded-md" />
            <div className="flex-1">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
