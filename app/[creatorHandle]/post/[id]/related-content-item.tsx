"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Music, FileText } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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

interface RelatedContentItemProps {
  id: string;
  title: string;
  type: "video" | "audio" | "text";
  thumbnailUrl?: string | null;
  duration?: number | null;
  isFree: boolean;
  hasAccess: boolean;
  creatorHandle: string;
}

const TypeIcons = {
  video: Play,
  audio: Music,
  text: FileText,
};

/**
 * RelatedContentItem - Client component for related content with image error handling
 *
 * Displays a compact content preview with:
 * - Thumbnail with fallback on error
 * - Title, type badge, and duration
 * - Lock overlay for paid content
 */
export function RelatedContentItem({
  id,
  title,
  type,
  thumbnailUrl,
  duration,
  isFree,
  hasAccess,
  creatorHandle,
}: RelatedContentItemProps) {
  const [imageError, setImageError] = useState(false);
  const itemHasAccess = isFree || hasAccess;

  const href = itemHasAccess
    ? `/${creatorHandle}/post/${id}`
    : `/${creatorHandle}`;

  const showFallback = !thumbnailUrl || imageError;

  return (
    <Link
      href={href}
      className={cn(
        "flex gap-3 p-3",
        itemHasAccess && "hover:bg-muted/50 transition-colors",
      )}
    >
      {/* Thumbnail */}
      <div className="relative w-24 aspect-video rounded-md overflow-hidden bg-muted shrink-0">
        {showFallback ? (
          <ThumbnailFallback
            type={type}
            hasAccess={itemHasAccess}
            hasError={imageError}
          />
        ) : (
          <>
            <Image
              src={thumbnailUrl!}
              alt={title}
              fill
              className={cn(
                "object-cover",
                !itemHasAccess && "blur-sm scale-105",
              )}
              sizes="96px"
              onError={() => setImageError(true)}
            />
            {!itemHasAccess && (
              <div className="absolute inset-0 bg-background/30 backdrop-blur-[2px] flex items-center justify-center">
                <div className="p-1 rounded-full bg-background/80">
                  <Play className="size-3" />
                </div>
              </div>
            )}
          </>
        )}
        {duration && itemHasAccess && (
          <span className="absolute bottom-1 right-1 text-[10px] bg-background/90 px-1 rounded">
            {formatDuration(duration)}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-foreground line-clamp-2">
          {title}
        </h4>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {type}
          </Badge>
          {isFree && (
            <Badge className="text-[10px] px-1.5 py-0 bg-primary text-primary-foreground">
              Free
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}

/**
 * ThumbnailFallback - Shows when thumbnail fails to load or is missing
 */
function ThumbnailFallback({
  type,
  hasAccess,
  hasError,
}: {
  type: "video" | "audio" | "text";
  hasAccess: boolean;
  hasError: boolean;
}) {
  const ItemIcon = TypeIcons[type];

  // Different gradient based on content type
  const gradients = {
    video: "from-primary/15 to-accent/20",
    audio: "from-accent/20 to-primary/15",
    text: "from-muted to-accent/15",
  };

  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center",
        `bg-gradient-to-br ${gradients[type]}`,
      )}
    >
      {hasError ? (
        // Error state - image failed to load
        <div className="flex flex-col items-center gap-1">
          <ItemIcon
            className={cn(
              "size-4 text-muted-foreground/50",
              !hasAccess && "blur-sm",
            )}
          />
        </div>
      ) : (
        // No thumbnail provided
        <ItemIcon
          className={cn(
            "size-5 text-muted-foreground/50",
            !hasAccess && "blur-sm",
          )}
        />
      )}

      {/* Lock overlay for paid content */}
      {!hasAccess && (
        <div className="absolute inset-0 bg-background/30 backdrop-blur-[2px] flex items-center justify-center">
          <div className="p-1 rounded-full bg-background/80">
            <Play className="size-3" />
          </div>
        </div>
      )}
    </div>
  );
}
