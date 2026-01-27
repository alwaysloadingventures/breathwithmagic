"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Video,
  Headphones,
  FileText,
  MoreVertical,
  Lock,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  formatDuration,
  getContentStatusVariant,
} from "@/lib/validations/content";
import type { ContentType, ContentStatus } from "@/lib/validations/content";

/**
 * ContentCard Props
 */
export interface ContentCardProps {
  id: string;
  type: ContentType;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  duration?: number | null;
  isFree: boolean;
  status: ContentStatus;
  program?: {
    id: string;
    title: string;
  } | null;
  publishedAt?: Date | string | null;
  createdAt: Date | string;
  onEdit?: () => void;
  onDelete?: () => void;
  onPublish?: () => void;
  onArchive?: () => void;
  className?: string;
}

/**
 * Get the icon for a content type
 */
function ContentTypeIcon({
  type,
  className,
}: {
  type: ContentType;
  className?: string;
}) {
  switch (type) {
    case "video":
      return <Video className={className} />;
    case "audio":
      return <Headphones className={className} />;
    case "text":
      return <FileText className={className} />;
  }
}

/**
 * ContentCard Component
 *
 * Displays a content item in a card format with thumbnail, metadata, and actions.
 * Used in the content list and program content views.
 */
export function ContentCard({
  id,
  type,
  title,
  description,
  thumbnailUrl,
  duration,
  isFree,
  status,
  program,
  publishedAt,
  createdAt,
  onEdit,
  onDelete,
  onPublish,
  onArchive,
  className,
}: ContentCardProps) {
  const statusVariant = getContentStatusVariant(status);
  const formattedDuration = duration ? formatDuration(duration) : null;
  const createdDate = new Date(createdAt);
  const publishedDate = publishedAt ? new Date(publishedAt) : null;

  return (
    <div
      className={cn(
        "group relative flex gap-4 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50",
        className,
      )}
    >
      {/* Thumbnail */}
      <Link
        href={`/creator/content/${id}/edit`}
        className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-md bg-muted sm:w-40"
      >
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className="object-cover"
            sizes="160px"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <ContentTypeIcon
              type={type}
              className="size-8 text-muted-foreground"
            />
          </div>
        )}

        {/* Duration overlay */}
        {formattedDuration && (
          <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
            {formattedDuration}
          </div>
        )}

        {/* Type icon overlay */}
        <div className="absolute left-1 top-1 rounded bg-black/70 p-1">
          <ContentTypeIcon type={type} className="size-3 text-white" />
        </div>
      </Link>

      {/* Content info */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Title and badges */}
        <div className="flex items-start justify-between gap-2">
          <Link href={`/creator/content/${id}/edit`} className="min-w-0 flex-1">
            <h3 className="truncate font-medium text-foreground hover:underline">
              {title}
            </h3>
          </Link>

          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 rounded-lg p-3 hover:bg-muted"
              aria-label="Content actions"
            >
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
              )}
              {onPublish && status === "draft" && (
                <DropdownMenuItem onClick={onPublish}>Publish</DropdownMenuItem>
              )}
              {onArchive && status === "published" && (
                <DropdownMenuItem onClick={onArchive}>Archive</DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Description */}
        {description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {description}
          </p>
        )}

        {/* Badges row */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant} className="text-xs">
            {status}
          </Badge>

          {isFree ? (
            <Badge variant="secondary" className="text-xs">
              <Eye className="mr-1 size-3" />
              Free
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              <Lock className="mr-1 size-3" />
              Paid
            </Badge>
          )}

          {program && (
            <Badge variant="outline" className="text-xs">
              {program.title}
            </Badge>
          )}
        </div>

        {/* Date */}
        <div className="mt-auto pt-2 text-xs text-muted-foreground">
          {status === "published" && publishedDate
            ? `Published ${publishedDate.toLocaleDateString()}`
            : `Created ${createdDate.toLocaleDateString()}`}
        </div>
      </div>
    </div>
  );
}

/**
 * ContentCardSkeleton
 *
 * Loading skeleton for ContentCard
 */
export function ContentCardSkeleton() {
  return (
    <div className="flex gap-4 rounded-lg border border-border bg-card p-3">
      <div className="aspect-video w-40 shrink-0 animate-pulse rounded-md bg-muted" />
      <div className="flex flex-1 flex-col">
        <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-full animate-pulse rounded bg-muted" />
        <div className="mt-2 flex gap-2">
          <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="mt-auto pt-2">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
