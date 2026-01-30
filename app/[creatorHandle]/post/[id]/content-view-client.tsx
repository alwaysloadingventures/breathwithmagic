"use client";

/**
 * ContentViewClient - Client component for content display
 *
 * Handles:
 * - Secure video player for video content (with signed URLs)
 * - Secure audio player for audio content (with signed URLs)
 * - Text display for text posts
 * - Paywall overlay for non-subscribers
 *
 * Security:
 * - Uses SecureVideoPlayer/SecureAudioPlayer for paid content
 * - These players fetch signed URLs from /api/content/[id]/media
 * - Periodic revalidation ensures access is maintained during playback
 *
 * @see PRD Phase 3, Task 12: Paywall Enforcement
 */

import dynamic from "next/dynamic";
import { FileText } from "lucide-react";
import { PaywallOverlay } from "@/components/content/paywall-overlay";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load secure video player for better performance
const SecureVideoPlayer = dynamic(
  () =>
    import("@/components/content/secure-video-player").then(
      (mod) => mod.SecureVideoPlayer,
    ),
  {
    loading: () => <VideoPlayerSkeleton />,
    ssr: false,
  },
);

// Lazy load secure audio player for better performance
const SecureAudioPlayer = dynamic(
  () =>
    import("@/components/content/secure-audio-player").then(
      (mod) => mod.SecureAudioPlayer,
    ),
  {
    loading: () => <AudioPlayerSkeleton />,
    ssr: false,
  },
);

interface ContentViewClientProps {
  contentId: string;
  type: "video" | "audio" | "text";
  title: string;
  description?: string | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  duration?: number | null;
  hasAccess: boolean;
  isAuthenticated: boolean;
  creatorHandle: string;
  creatorName: string;
  price: string;
  trialEnabled: boolean;
  initialPosition?: number;
}

export function ContentViewClient({
  contentId,
  type,
  title,
  description,
  mediaUrl,
  thumbnailUrl,
  duration,
  hasAccess,
  isAuthenticated,
  creatorHandle,
  creatorName,
  price,
  trialEnabled,
  initialPosition = 0,
}: ContentViewClientProps) {
  // If no access, show paywall
  if (!hasAccess) {
    return (
      <PaywallOverlay
        thumbnailUrl={thumbnailUrl}
        creatorHandle={creatorHandle}
        price={price}
        trialEnabled={trialEnabled}
        isAuthenticated={isAuthenticated}
        contentTitle={title}
      />
    );
  }

  // Video content - use SecureVideoPlayer which fetches signed URLs
  // The SecureVideoPlayer handles:
  // - Fetching signed URLs from /api/content/[id]/media
  // - Periodic revalidation during playback
  // - Automatic URL refresh before expiration
  // - Displaying paywall if access is revoked
  if (type === "video" && mediaUrl) {
    return (
      <SecureVideoPlayer
        contentId={contentId}
        title={title}
        duration={duration}
        poster={thumbnailUrl}
        initialPosition={initialPosition}
      />
    );
  }

  // Audio content - use SecureAudioPlayer which fetches signed URLs
  // The SecureAudioPlayer handles:
  // - Fetching signed URLs from /api/content/[id]/media
  // - Periodic revalidation during playback
  // - Automatic URL refresh before expiration
  // - Displaying paywall if access is revoked
  if (type === "audio" && mediaUrl) {
    return (
      <SecureAudioPlayer
        contentId={contentId}
        title={title}
        duration={duration}
        artwork={thumbnailUrl}
        creatorName={creatorName}
        initialPosition={initialPosition}
      />
    );
  }

  // Text content
  if (type === "text") {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-muted">
            <FileText className="size-5 text-muted-foreground" />
          </div>
          <span className="text-sm text-muted-foreground">Text post</span>
        </div>
        {description ? (
          <div className="prose prose-sm max-w-none text-foreground">
            <p className="whitespace-pre-wrap">{description}</p>
          </div>
        ) : (
          <p className="text-muted-foreground italic">No content available.</p>
        )}
      </div>
    );
  }

  // Fallback for missing media - show a nice placeholder with content info
  return (
    <MediaUnavailableFallback
      type={type}
      title={title}
      thumbnailUrl={thumbnailUrl}
      duration={duration}
    />
  );
}

/**
 * MediaUnavailableFallback - Displayed when content is accessible but media URL is missing
 */
function MediaUnavailableFallback({
  type,
  title,
  thumbnailUrl,
  duration,
}: {
  type: "video" | "audio" | "text";
  title: string;
  thumbnailUrl?: string | null;
  duration?: number | null;
}) {
  const TypeIcon = {
    video: () => (
      <svg
        className="size-12 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
        />
      </svg>
    ),
    audio: () => (
      <svg
        className="size-12 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
        />
      </svg>
    ),
    text: () => (
      <FileText className="size-12 text-muted-foreground" aria-hidden="true" />
    ),
  }[type];

  // Format duration for display
  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins} min`;
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Thumbnail area with gradient overlay */}
      <div className="relative aspect-video bg-gradient-to-br from-muted via-accent/20 to-muted">
        {thumbnailUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 blur-sm"
            style={{ backgroundImage: `url(${thumbnailUrl})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />

        {/* Content placeholder */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
          <div className="p-4 rounded-full bg-background/80 backdrop-blur-sm mb-4">
            <TypeIcon />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
          {duration && (
            <p className="text-sm text-muted-foreground mb-4">
              {formatDuration(duration)}
            </p>
          )}
          <div className="bg-muted/80 backdrop-blur-sm rounded-lg px-4 py-3 max-w-sm">
            <p className="text-sm text-muted-foreground">
              {type === "video"
                ? "Video content is being processed or is temporarily unavailable."
                : type === "audio"
                  ? "Audio content is being processed or is temporarily unavailable."
                  : "Content is not available at the moment."}
            </p>
          </div>
        </div>
      </div>

      {/* Info bar */}
      <div className="p-4 border-t border-border bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          The content may still be processing. Please check back in a few
          minutes.
        </p>
      </div>
    </div>
  );
}

/**
 * Video Player Skeleton
 */
function VideoPlayerSkeleton() {
  return (
    <div className="aspect-video bg-muted rounded-lg animate-pulse flex items-center justify-center">
      <div className="w-16 h-16 bg-muted-foreground/20 rounded-full flex items-center justify-center">
        <Skeleton className="w-8 h-8 rounded" />
      </div>
    </div>
  );
}

/**
 * Audio Player Skeleton
 */
function AudioPlayerSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-2 w-full mt-4" />
        </div>
      </div>
    </div>
  );
}
