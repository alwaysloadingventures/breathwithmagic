/**
 * RelatedContent - Shows related content suggestions
 *
 * Displays a list of related content from the same creator
 * or similar content for discovery.
 */

import Image from "next/image";
import Link from "next/link";
import { ContentType } from "@prisma/client";
import { Lock, Play, Music, FileText } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Format duration in seconds to human-readable string
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface RelatedContentItem {
  id: string;
  type: ContentType;
  title: string;
  thumbnailUrl?: string | null;
  duration?: number | null;
  isFree: boolean;
  hasAccess: boolean;
}

interface RelatedContentProps {
  /** List of related content items */
  items: RelatedContentItem[];
  /** Creator handle for URL construction */
  creatorHandle: string;
  /** Title for the section */
  title?: string;
  /** Custom className */
  className?: string;
}

export function RelatedContent({
  items,
  creatorHandle,
  title = "More from this creator",
  className,
}: RelatedContentProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {items.map((item) => (
            <RelatedContentRow
              key={item.id}
              item={item}
              creatorHandle={creatorHandle}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface RelatedContentRowProps {
  item: RelatedContentItem;
  creatorHandle: string;
}

function RelatedContentRow({ item, creatorHandle }: RelatedContentRowProps) {
  const canView = item.hasAccess;
  const href = canView
    ? `/${creatorHandle}/post/${item.id}`
    : `/${creatorHandle}`;

  // Type icons
  const TypeIcon = {
    video: Play,
    audio: Music,
    text: FileText,
  }[item.type];

  return (
    <Link
      href={href}
      className={cn(
        "flex gap-3 group",
        canView &&
          "hover:bg-muted/50 -mx-2 px-2 py-1 rounded-lg transition-colors",
      )}
    >
      {/* Thumbnail */}
      <div className="relative w-28 aspect-video rounded-md overflow-hidden bg-muted shrink-0">
        {item.thumbnailUrl ? (
          <>
            <Image
              src={item.thumbnailUrl}
              alt={item.title}
              fill
              className={cn("object-cover", !canView && "blur-sm scale-105")}
              sizes="112px"
            />
            {!canView && (
              <div className="absolute inset-0 bg-background/30 backdrop-blur-[2px]" />
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-accent/30">
            <TypeIcon className="size-6 text-muted-foreground/50" />
          </div>
        )}

        {/* Lock for paywalled */}
        {!canView && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-1.5 rounded-full bg-background/80 backdrop-blur-sm">
              <Lock className="size-3" />
            </div>
          </div>
        )}

        {/* Duration */}
        {item.duration && canView && (
          <span className="absolute bottom-1 right-1 text-[10px] bg-background/90 backdrop-blur-sm px-1 rounded">
            {formatDuration(item.duration)}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 py-0.5">
        <h4
          className={cn(
            "font-medium text-sm text-foreground line-clamp-2",
            canView && "group-hover:text-primary transition-colors",
          )}
        >
          {item.title}
        </h4>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
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
}

/**
 * Skeleton loading state for RelatedContent
 */
export function RelatedContentSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-28 aspect-video rounded-md" />
              <div className="flex-1">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
