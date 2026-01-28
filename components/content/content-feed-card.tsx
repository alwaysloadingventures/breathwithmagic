"use client";

/**
 * ContentFeedCard - Card component for displaying content in the feed
 *
 * Shows content preview with creator info, optimized for the home feed.
 * Handles both accessible and paywalled content.
 */

import Image from "next/image";
import Link from "next/link";
import { ContentType } from "@prisma/client";
import { Lock, Play, Music, FileText, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Format duration in seconds to human-readable string
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export interface ContentFeedCardProps {
  /** Content ID */
  id: string;
  /** Content type */
  type: ContentType;
  /** Content title */
  title: string;
  /** Content description */
  description?: string | null;
  /** Thumbnail URL */
  thumbnailUrl?: string | null;
  /** Duration in seconds */
  duration?: number | null;
  /** Whether content is free */
  isFree: boolean;
  /** Whether user has access */
  hasAccess: boolean;
  /** Published date ISO string */
  publishedAt?: string | null;
  /** Creator info */
  creator: {
    id: string;
    handle: string;
    displayName: string;
    avatarUrl?: string | null;
    category: string;
  };
  /** Custom className */
  className?: string;
}

export function ContentFeedCard({
  id,
  type,
  title,
  description,
  thumbnailUrl,
  duration,
  isFree,
  hasAccess,
  publishedAt,
  creator,
  className,
}: ContentFeedCardProps) {
  const canView = hasAccess;
  const contentUrl = `/${creator.handle}/post/${id}`;
  const creatorUrl = `/${creator.handle}`;

  // Type icons
  const TypeIcon = {
    video: Play,
    audio: Music,
    text: FileText,
  }[type];

  // Creator initials
  const initials = creator.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Thumbnail / Preview */}
      <Link
        href={canView ? contentUrl : creatorUrl}
        className="block relative aspect-video bg-muted overflow-hidden group"
      >
        {thumbnailUrl ? (
          <>
            <Image
              src={thumbnailUrl}
              alt={title}
              fill
              className={cn(
                "object-cover transition-all duration-300",
                canView && "group-hover:scale-105",
                !canView && "blur-md scale-110",
              )}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            {!canView && (
              <div className="absolute inset-0 bg-background/40 backdrop-blur-sm" />
            )}
          </>
        ) : (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center",
              "bg-gradient-to-br from-muted to-accent/50",
            )}
          >
            <TypeIcon
              className={cn(
                "size-12 text-muted-foreground/50",
                !canView && "blur-sm",
              )}
            />
          </div>
        )}

        {/* Lock Overlay for Paid Content */}
        {!canView && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-foreground">
            <div className="p-3 rounded-full bg-background/80 backdrop-blur-sm mb-2">
              <Lock className="size-5" />
            </div>
            <span className="text-sm font-medium bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full">
              Subscribe to unlock
            </span>
          </div>
        )}

        {/* Duration Badge */}
        {duration && canView && (
          <Badge
            variant="secondary"
            className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm"
          >
            {formatDuration(duration)}
          </Badge>
        )}

        {/* Type Badge */}
        <Badge
          variant="secondary"
          className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm capitalize"
        >
          <TypeIcon className="size-3 mr-1" />
          {type}
        </Badge>

        {/* Free Badge */}
        {isFree && (
          <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
            Free
          </Badge>
        )}
      </Link>

      <CardContent className="p-4">
        {/* Creator Row */}
        <div className="flex items-center gap-3 mb-3">
          <Link href={creatorUrl} className="shrink-0">
            <Avatar className="size-10">
              {creator.avatarUrl && (
                <AvatarImage
                  src={creator.avatarUrl}
                  alt={creator.displayName}
                />
              )}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={creatorUrl}
              className="font-medium text-foreground hover:text-primary transition-colors truncate block"
            >
              {creator.displayName}
            </Link>
            <p className="text-xs text-muted-foreground truncate">
              @{creator.handle}
            </p>
          </div>
        </div>

        {/* Title */}
        <Link
          href={canView ? contentUrl : creatorUrl}
          className={cn(
            "font-semibold text-foreground line-clamp-2 mb-1",
            canView && "hover:text-primary transition-colors",
          )}
        >
          {title}
        </Link>

        {/* Description */}
        {description && canView && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {description}
          </p>
        )}

        {/* Meta Row */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {publishedAt && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {formatRelativeTime(publishedAt)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton loading state for ContentFeedCard
 */
export function ContentFeedCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-video" />
      <CardContent className="p-4">
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
      </CardContent>
    </Card>
  );
}
