"use client";

/**
 * ContentViewClient - Client component for content display
 *
 * Handles:
 * - Video player for video content
 * - Audio player for audio content
 * - Text display for text posts
 * - Paywall overlay for non-subscribers
 */

import dynamic from "next/dynamic";
import { FileText } from "lucide-react";
import { PaywallOverlay } from "@/components/content/paywall-overlay";
import { AudioPlayer } from "@/components/content/audio-player";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load video player for better performance
const VideoPlayer = dynamic(
  () =>
    import("@/components/content/video-player").then((mod) => mod.VideoPlayer),
  {
    loading: () => <VideoPlayerSkeleton />,
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

  // Video content
  if (type === "video" && mediaUrl) {
    return (
      <VideoPlayer
        src={mediaUrl}
        poster={thumbnailUrl}
        title={title}
        duration={duration}
        contentId={contentId}
        initialPosition={initialPosition}
      />
    );
  }

  // Audio content
  if (type === "audio" && mediaUrl) {
    return (
      <AudioPlayer
        src={mediaUrl}
        title={title}
        duration={duration}
        contentId={contentId}
        initialPosition={initialPosition}
        artwork={thumbnailUrl}
        creatorName={creatorName}
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
