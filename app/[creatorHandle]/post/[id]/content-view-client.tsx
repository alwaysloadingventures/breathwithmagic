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

  // Fallback for missing media
  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center">
      <p className="text-muted-foreground">
        This content is not available at the moment.
      </p>
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
