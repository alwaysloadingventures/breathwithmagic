"use client";

/**
 * SecureVideoPlayer - Paywall-protected video player
 *
 * This component wraps the base VideoPlayer with:
 * - Signed URL fetching from the media API
 * - Periodic access revalidation during playback
 * - Automatic handling of expired URLs
 * - Paywall display when access is revoked
 *
 * Performance: VideoPlayer is dynamically imported to reduce initial bundle size.
 * The base player is only loaded when the user has access to the content.
 *
 * @see PRD Phase 3, Task 12: Paywall Enforcement
 */

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Dynamically import VideoPlayer to reduce initial bundle size
 * Only loaded when user has access to content
 */
const VideoPlayer = dynamic(
  () => import("./video-player").then((mod) => mod.VideoPlayer),
  {
    loading: () => (
      <div className="relative aspect-video bg-muted rounded-lg">
        <Skeleton className="absolute inset-0 rounded-lg" />
        <div className="absolute inset-0 flex items-center justify-center">
          <RefreshCw className="size-8 text-muted-foreground animate-spin" />
        </div>
      </div>
    ),
    ssr: false,
  },
);

interface SecureVideoPlayerProps {
  /** Content ID to fetch media URL for */
  contentId: string;
  /** Video title for accessibility */
  title: string;
  /** Total duration in seconds */
  duration?: number | null;
  /** Poster/thumbnail image URL */
  poster?: string | null;
  /** Initial playback position in seconds */
  initialPosition?: number;
  /** Callback when playback starts */
  onPlay?: () => void;
  /** Callback when playback pauses */
  onPause?: () => void;
  /** Callback when playback ends */
  onEnded?: () => void;
  /** Callback when access is denied (for showing paywall) */
  onAccessDenied?: (creator: CreatorPaywallInfo) => void;
  /** Custom className */
  className?: string;
}

interface CreatorPaywallInfo {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
  subscriptionPrice: {
    amount: string;
    cents: number;
  };
  trialEnabled: boolean;
}

interface MediaResponse {
  url: string;
  expiresAt: number;
  type: string;
  playbackUrl?: string;
  contentId: string;
  duration?: number;
  title: string;
  thumbnailUrl?: string;
  revalidateIn: number;
}

interface ErrorResponse {
  error: string;
  code: string;
  reason?: string;
  creator?: CreatorPaywallInfo;
}

type PlayerState =
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "error"
  | "access_denied"
  | "expired";

// Revalidation interval: check access every 5 minutes during playback
const REVALIDATION_INTERVAL = 5 * 60 * 1000;

// URL refresh buffer: refresh URL 60 seconds before expiration
const URL_REFRESH_BUFFER = 60;

export function SecureVideoPlayer({
  contentId,
  title,
  duration,
  poster,
  initialPosition = 0,
  onPlay,
  onPause,
  onEnded,
  onAccessDenied,
  className,
}: SecureVideoPlayerProps) {
  const [state, setState] = useState<PlayerState>("loading");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creator, setCreator] = useState<CreatorPaywallInfo | null>(null);

  const revalidationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const urlRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(false);
  // Store the fetch function ref to avoid circular dependency
  const fetchMediaUrlRef = useRef<(() => Promise<boolean>) | null>(null);

  /**
   * Schedule URL refresh before it expires
   */
  const scheduleUrlRefresh = useCallback((expirationTime: number) => {
    if (urlRefreshTimerRef.current) {
      clearTimeout(urlRefreshTimerRef.current);
    }

    const now = Math.floor(Date.now() / 1000);
    const refreshIn =
      Math.max(0, expirationTime - now - URL_REFRESH_BUFFER) * 1000;

    urlRefreshTimerRef.current = setTimeout(async () => {
      // Only refresh if still playing
      if (isPlayingRef.current && fetchMediaUrlRef.current) {
        await fetchMediaUrlRef.current();
      }
    }, refreshIn);
  }, []);

  /**
   * Fetch signed media URL from the API
   */
  const fetchMediaUrl = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`/api/content/${contentId}/media`);

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();

        if (response.status === 403 && errorData.creator) {
          // Access denied - show paywall
          setCreator(errorData.creator);
          setState("access_denied");
          onAccessDenied?.(errorData.creator);
          return false;
        }

        if (response.status === 401) {
          // Not authenticated
          setError("Please sign in to watch this content");
          setState("access_denied");
          return false;
        }

        setError(errorData.error || "Failed to load video");
        setState("error");
        return false;
      }

      const data: MediaResponse = await response.json();

      setMediaUrl(data.url);
      setState("ready");
      setError(null);

      // Schedule URL refresh before expiration
      scheduleUrlRefresh(data.expiresAt);

      return true;
    } catch (err) {
      console.error("Failed to fetch media URL:", err);
      setError("Network error. Please check your connection.");
      setState("error");
      return false;
    }
  }, [contentId, onAccessDenied, scheduleUrlRefresh]);

  // Keep the ref updated
  useEffect(() => {
    fetchMediaUrlRef.current = fetchMediaUrl;
  }, [fetchMediaUrl]);

  /**
   * Revalidate access during playback
   */
  const revalidateAccess = useCallback(async (): Promise<void> => {
    if (!isPlayingRef.current) return;

    try {
      const response = await fetch(`/api/content/${contentId}/revalidate`);
      const data = await response.json();

      if (!data.valid) {
        // Access revoked - stop playback and show paywall
        setState("access_denied");
        setCreator(data.creator || null);
        if (data.creator) {
          onAccessDenied?.(data.creator);
        }

        // Clear timers
        if (revalidationTimerRef.current) {
          clearInterval(revalidationTimerRef.current);
        }
        if (urlRefreshTimerRef.current) {
          clearTimeout(urlRefreshTimerRef.current);
        }
      }
    } catch (err) {
      console.error("Failed to revalidate access:", err);
      // Don't interrupt playback on revalidation errors
      // The URL will expire naturally if there's a real access issue
    }
  }, [contentId, onAccessDenied]);

  /**
   * Start periodic revalidation during playback
   */
  const startRevalidation = useCallback(() => {
    if (revalidationTimerRef.current) {
      clearInterval(revalidationTimerRef.current);
    }

    revalidationTimerRef.current = setInterval(
      revalidateAccess,
      REVALIDATION_INTERVAL,
    );
  }, [revalidateAccess]);

  /**
   * Stop periodic revalidation
   */
  const stopRevalidation = useCallback(() => {
    if (revalidationTimerRef.current) {
      clearInterval(revalidationTimerRef.current);
      revalidationTimerRef.current = null;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    let cancelled = false;

    const doFetch = async () => {
      if (!cancelled) {
        await fetchMediaUrl();
      }
    };

    doFetch();

    return () => {
      cancelled = true;
      // Cleanup timers on unmount
      if (revalidationTimerRef.current) {
        clearInterval(revalidationTimerRef.current);
      }
      if (urlRefreshTimerRef.current) {
        clearTimeout(urlRefreshTimerRef.current);
      }
    };
  }, [fetchMediaUrl]);

  // Handle play event
  const handlePlay = useCallback(() => {
    isPlayingRef.current = true;
    setState("playing");
    startRevalidation();
    onPlay?.();
  }, [startRevalidation, onPlay]);

  // Handle pause event
  const handlePause = useCallback(() => {
    isPlayingRef.current = false;
    setState("paused");
    stopRevalidation();
    onPause?.();
  }, [stopRevalidation, onPause]);

  // Handle end event
  const handleEnded = useCallback(() => {
    isPlayingRef.current = false;
    stopRevalidation();
    onEnded?.();
  }, [stopRevalidation, onEnded]);

  // Render loading state
  if (state === "loading") {
    return (
      <div
        className={cn("relative aspect-video bg-muted rounded-lg", className)}
      >
        <Skeleton className="absolute inset-0 rounded-lg" />
        <div className="absolute inset-0 flex items-center justify-center">
          <RefreshCw className="size-8 text-muted-foreground animate-spin" />
        </div>
      </div>
    );
  }

  // Render error state
  if (state === "error") {
    return (
      <div
        className={cn(
          "relative aspect-video bg-muted rounded-lg flex flex-col items-center justify-center gap-6 p-8",
          className,
        )}
      >
        <AlertCircle className="size-12 text-muted-foreground" />
        <p className="text-center text-muted-foreground">{error}</p>
        <Button
          onClick={() => fetchMediaUrl()}
          variant="outline"
          size="lg"
          className="min-h-[44px] min-w-[44px]"
        >
          <RefreshCw className="size-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  // Render paywall state
  if (state === "access_denied") {
    return (
      <PaywallOverlay creator={creator} poster={poster} className={className} />
    );
  }

  // Render video player
  if (!mediaUrl) {
    return null;
  }

  return (
    <VideoPlayer
      src={mediaUrl}
      poster={poster}
      title={title}
      duration={duration}
      contentId={contentId}
      initialPosition={initialPosition}
      onPlay={handlePlay}
      onPause={handlePause}
      onEnded={handleEnded}
      className={className}
    />
  );
}

/**
 * Paywall overlay component
 */
interface PaywallOverlayProps {
  creator: CreatorPaywallInfo | null;
  poster?: string | null;
  className?: string;
}

function PaywallOverlay({ creator, poster, className }: PaywallOverlayProps) {
  return (
    <div
      className={cn(
        "relative aspect-video rounded-lg overflow-hidden",
        className,
      )}
    >
      {/* Blurred background */}
      {poster && (
        <div
          className="absolute inset-0 bg-cover bg-center blur-xl scale-110 opacity-50"
          style={{ backgroundImage: `url(${poster})` }}
        />
      )}
      <div className="absolute inset-0 bg-black/60" />

      {/* Paywall content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-background/95 backdrop-blur-sm rounded-xl p-8 max-w-sm shadow-lg">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="size-8 text-primary" />
          </div>

          <h3 className="text-xl font-semibold text-foreground mb-2">
            Subscribe to unlock
          </h3>

          {creator && (
            <>
              <p className="text-muted-foreground mb-4">
                {creator.subscriptionPrice.amount}/month
                <span className="mx-2">·</span>
                Cancel anytime
              </p>

              {creator.trialEnabled && (
                <p className="text-sm text-muted-foreground mb-4">
                  Start with a 7-day free trial
                </p>
              )}

              <a
                href={`/${creator.handle}?subscribe=true`}
                className="inline-flex items-center justify-center w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
              >
                Subscribe now
              </a>

              <p className="text-xs text-muted-foreground mt-4">
                Get access to all content from {creator.displayName}
              </p>
            </>
          )}

          {!creator && (
            <p className="text-muted-foreground">
              Please sign in to access this content
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
