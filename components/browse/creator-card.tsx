import Image from "next/image";
import Link from "next/link";
import { CreatorCategory, SubscriptionPriceTier } from "@prisma/client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Maps subscription price tiers to display values
 */
const PRICE_DISPLAY: Record<SubscriptionPriceTier, string> = {
  TIER_FREE: "Free",
  TIER_500: "$5",
  TIER_1000: "$10",
  TIER_1500: "$15",
  TIER_2000: "$20",
  TIER_2500: "$25",
  TIER_3000: "$30",
  TIER_4000: "$40",
  TIER_5000: "$50",
  TIER_7500: "$75",
  TIER_9900: "$99",
};

/**
 * Maps category enums to human-readable labels
 */
const CATEGORY_LABELS: Record<CreatorCategory, string> = {
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

export interface CreatorCardProps {
  /** Creator's unique handle for URL */
  handle: string;
  /** Display name shown on card */
  displayName: string;
  /** Creator's bio/description */
  bio?: string | null;
  /** Avatar image URL */
  avatarUrl?: string | null;
  /** Cover image URL for card background */
  coverImageUrl?: string | null;
  /** Creator's category */
  category: CreatorCategory;
  /** Subscription price tier */
  subscriptionPrice: SubscriptionPriceTier;
  /** Whether trial is enabled */
  trialEnabled?: boolean;
  /** Whether creator is verified */
  isVerified?: boolean;
  /** Number of subscribers (optional, for social proof) */
  subscriberCount?: number;
  /** Custom className for card */
  className?: string;
  /** Whether to prioritize image loading (for LCP optimization) */
  priority?: boolean;
}

/**
 * CreatorCard - Displays a creator in a grid/list format
 *
 * Used on the homepage, explore page, and search results.
 * Links to the creator's profile page.
 */
export function CreatorCard({
  handle,
  displayName,
  bio,
  avatarUrl,
  coverImageUrl,
  category,
  subscriptionPrice,
  trialEnabled = false,
  isVerified = false,
  subscriberCount,
  className,
  priority = false,
}: CreatorCardProps) {
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Link href={`/${handle}`} className="block group">
      <Card
        className={cn(
          "overflow-hidden transition-all duration-200 hover:shadow-lg hover:ring-2 hover:ring-primary/20",
          className,
        )}
      >
        {/* Cover Image */}
        <div className="relative aspect-[16/9] bg-muted overflow-hidden">
          {coverImageUrl ? (
            <Image
              src={coverImageUrl}
              alt={`${displayName}'s cover`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={priority}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent" />
          )}
          {/* Category Badge */}
          <Badge
            variant="secondary"
            className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm"
          >
            {CATEGORY_LABELS[category]}
          </Badge>
        </div>

        <CardContent className="pt-0 -mt-6 relative">
          {/* Avatar */}
          <div className="flex items-end gap-3 mb-3">
            <Avatar className="size-14 border-4 border-card ring-2 ring-border">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={displayName} />
              ) : null}
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            {isVerified && (
              <span
                className="text-primary"
                title="Verified Creator"
                aria-label="Verified Creator"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="size-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            )}
          </div>

          {/* Name & Bio */}
          <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {displayName}
          </h3>
          {bio && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {bio}
            </p>
          )}

          {/* Price & Subscriber Count */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <div>
              <span className="font-semibold text-foreground">
                {PRICE_DISPLAY[subscriptionPrice]}
              </span>
              <span className="text-muted-foreground">/month</span>
              {trialEnabled && (
                <span className="text-xs text-muted-foreground block">
                  7-day free trial
                </span>
              )}
            </div>
            {subscriberCount !== undefined && subscriberCount > 0 && (
              <span className="text-sm text-muted-foreground">
                {subscriberCount.toLocaleString()} subscriber
                {subscriberCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * CreatorCardSkeleton - Loading placeholder for CreatorCard
 */
export function CreatorCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-[16/9] bg-muted animate-pulse" />
      <CardContent className="pt-0 -mt-6 relative">
        <div className="flex items-end gap-3 mb-3">
          <div className="size-14 rounded-full bg-muted animate-pulse border-4 border-card" />
        </div>
        <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        <div className="h-4 w-full bg-muted animate-pulse rounded mt-2" />
        <div className="h-4 w-2/3 bg-muted animate-pulse rounded mt-1" />
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <div className="h-5 w-20 bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
    </Card>
  );
}
