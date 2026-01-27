import Image from "next/image";
import Link from "next/link";
import { ContentType } from "@prisma/client";
import { Lock, Play, FileText, Music } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Format duration in seconds to human-readable string
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export interface ContentPreviewCardProps {
  /** Content ID for linking */
  id: string;
  /** Creator handle for URL construction */
  creatorHandle: string;
  /** Content title */
  title: string;
  /** Content description */
  description?: string | null;
  /** Thumbnail URL */
  thumbnailUrl?: string | null;
  /** Content type (video, audio, text) */
  type: ContentType;
  /** Duration in seconds (for video/audio) */
  duration?: number | null;
  /** Whether content is free */
  isFree: boolean;
  /** Whether user has access (subscribed or free content) */
  hasAccess: boolean;
  /** Published date */
  publishedAt?: Date | null;
  /** Custom className */
  className?: string;
}

/**
 * ContentPreviewCard - Shows content with blurred overlay for paid content
 *
 * Used on creator profile pages to display content previews.
 * Shows full content for free posts, blurred thumbnails with lock icon for paid.
 */
export function ContentPreviewCard({
  id,
  creatorHandle,
  title,
  description,
  thumbnailUrl,
  type,
  duration,
  isFree,
  hasAccess,
  publishedAt,
  className,
}: ContentPreviewCardProps) {
  const canView = isFree || hasAccess;
  const href = canView ? `/${creatorHandle}/post/${id}` : `/${creatorHandle}`;

  // Type icons
  const TypeIcon = {
    video: Play,
    audio: Music,
    text: FileText,
  }[type];

  return (
    <Link href={href} className="block group">
      <Card
        className={cn(
          "overflow-hidden transition-all duration-200",
          canView
            ? "hover:shadow-lg hover:ring-2 hover:ring-primary/20"
            : "cursor-default",
          className,
        )}
      >
        {/* Thumbnail / Preview */}
        <div className="relative aspect-video bg-muted overflow-hidden">
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
                <Lock className="size-6" />
              </div>
              <span className="text-sm font-medium bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full">
                Subscribe to unlock
              </span>
            </div>
          )}

          {/* Duration Badge for Video/Audio */}
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
        </div>

        <CardContent className="p-4">
          <h3
            className={cn(
              "font-semibold text-foreground truncate",
              canView && "group-hover:text-primary transition-colors",
            )}
          >
            {title}
          </h3>
          {description && canView && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {description}
            </p>
          )}
          {publishedAt && (
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(publishedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * ContentPreviewCardSkeleton - Loading placeholder for ContentPreviewCard
 */
export function ContentPreviewCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-video bg-muted animate-pulse" />
      <CardContent className="p-4">
        <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
        <div className="h-4 w-full bg-muted animate-pulse rounded mt-2" />
        <div className="h-3 w-24 bg-muted animate-pulse rounded mt-2" />
      </CardContent>
    </Card>
  );
}
