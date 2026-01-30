"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CreatorCategory, SubscriptionPriceTier } from "@prisma/client";
import { Heart, UserMinus, Loader2, CheckCircle2, Video } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export interface FollowingCreatorCardProps {
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
  /** Number of content pieces */
  contentCount?: number;
  /** Callback when unfollow is clicked */
  onUnfollow: () => void;
  /** Custom className for card */
  className?: string;
}

/**
 * FollowingCreatorCard - Displays a followed creator with unfollow option
 *
 * Used on the /following page.
 * Shows creator info with an unfollow button.
 */
export function FollowingCreatorCard({
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
  contentCount,
  onUnfollow,
  className,
}: FollowingCreatorCardProps) {
  const [isUnfollowing, setIsUnfollowing] = useState(false);
  const [isHoveringUnfollow, setIsHoveringUnfollow] = useState(false);

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleUnfollowClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsUnfollowing(true);
    await onUnfollow();
  };

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-200 hover:shadow-lg hover:ring-2 hover:ring-primary/20",
        className,
      )}
    >
      {/* Cover Image - Clickable to profile */}
      <Link href={`/${handle}`} className="block group">
        <div className="relative aspect-[16/9] bg-muted overflow-hidden">
          {coverImageUrl ? (
            <Image
              src={coverImageUrl}
              alt={`${displayName}'s cover`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
          {/* Following indicator */}
          <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm rounded-full p-1.5">
            <Heart className="size-4 text-primary fill-primary" />
          </div>
        </div>
      </Link>

      <CardContent className="pt-0 -mt-6 relative">
        {/* Avatar - Clickable to profile */}
        <Link href={`/${handle}`} className="block">
          <div className="flex items-end gap-3 mb-3">
            <Avatar className="size-14 border-4 border-card ring-2 ring-border">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={displayName} />
              ) : null}
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            {isVerified && (
              <CheckCircle2
                className="size-5 text-primary"
                aria-label="Verified Creator"
              />
            )}
          </div>
        </Link>

        {/* Name & Bio - Clickable to profile */}
        <Link href={`/${handle}`} className="block group">
          <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {displayName}
          </h3>
          <p className="text-sm text-muted-foreground">@{handle}</p>
          {bio && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {bio}
            </p>
          )}
        </Link>

        {/* Stats Row */}
        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
          {contentCount !== undefined && contentCount > 0 && (
            <span className="flex items-center gap-1">
              <Video className="size-3.5" />
              {contentCount} post{contentCount !== 1 ? "s" : ""}
            </span>
          )}
          {subscriberCount !== undefined && subscriberCount > 0 && (
            <span>
              {subscriberCount.toLocaleString()} subscriber
              {subscriberCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Price & Actions */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border gap-3">
          <div className="flex-1 min-w-0">
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

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Unfollow Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnfollowClick}
              onMouseEnter={() => setIsHoveringUnfollow(true)}
              onMouseLeave={() => setIsHoveringUnfollow(false)}
              disabled={isUnfollowing}
              className={cn(
                "min-h-[36px] min-w-[90px] transition-all duration-150",
                isHoveringUnfollow
                  ? "border-destructive text-destructive hover:bg-destructive/5"
                  : "border-primary/50 text-primary",
              )}
              aria-label="Unfollow"
              title="Click to unfollow"
            >
              {isUnfollowing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isHoveringUnfollow ? (
                <>
                  <UserMinus className="size-4 mr-1" />
                  Unfollow
                </>
              ) : (
                <>
                  <Heart className="size-4 mr-1 fill-current" />
                  Following
                </>
              )}
            </Button>

            {/* Subscribe Button */}
            <Link href={`/${handle}`}>
              <Button size="sm" className="min-h-[36px]">
                {trialEnabled ? "Try free" : "Subscribe"}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * FollowingCreatorCardSkeleton - Loading placeholder for FollowingCreatorCard
 */
export function FollowingCreatorCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-[16/9] bg-muted animate-pulse" />
      <CardContent className="pt-0 -mt-6 relative">
        <div className="flex items-end gap-3 mb-3">
          <div className="size-14 rounded-full bg-muted animate-pulse border-4 border-card" />
        </div>
        <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        <div className="h-4 w-20 bg-muted animate-pulse rounded mt-1" />
        <div className="h-4 w-full bg-muted animate-pulse rounded mt-2" />
        <div className="h-4 w-2/3 bg-muted animate-pulse rounded mt-1" />
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <div className="h-5 w-20 bg-muted animate-pulse rounded" />
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-muted animate-pulse rounded" />
            <div className="h-9 w-20 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
