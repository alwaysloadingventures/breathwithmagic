"use client";

/**
 * SecureAudioPlayer - Paywall-protected audio player
 *
 * This component wraps the base AudioPlayer with:
 * - Signed URL fetching from the media API
 * - Periodic access revalidation during playback
 * - Automatic handling of expired URLs
 * - Paywall display when access is revoked
 *
 * Performance: AudioPlayer is dynamically imported to reduce initial bundle size.
 * The base player is only loaded when the user has access to the content.
 *
 * @see PRD Phase 3, Task 12: Paywall Enforcement
 */

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, RefreshCw, AlertCircle, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/lib/button-variants";

/**
 * Dynamically import AudioPlayer to reduce initial bundle size
 * Only loaded when user has access to content
 */
const AudioPlayer = dynamic(
  () => import("./audio-player").then((mod) => mod.AudioPlayer),
  {
    loading: () => (
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
    ),
    ssr: false,
  },
);

interface SecureAudioPlayerProps {
  /** Content ID to fetch media URL for */
  contentId: string;
  /** Track title */
  title: string;
  /** Total duration in seconds */
  duration?: number | null;
  /** Thumbnail/artwork URL */
  artwork?: string | null;
  /** Creator name */
  creatorName?: string;
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

export function SecureAudioPlayer({
  contentId,
  title,
  duration,
  artwork,
  creatorName,
  initialPosition = 0,
  onPlay,
  onPause,
  onEnded,
  onAccessDenied,
  className,
}: SecureAudioPlayerProps) {
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
          setError("Please sign in to listen to this content");
          setState("access_denied");
          return false;
        }

        setError(errorData.error || "Failed to load audio");
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
        className={cn("bg-card border border-border rounded-xl p-4", className)}
      >
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

  // Render error state
  if (state === "error") {
    return (
      <div
        className={cn(
          "bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center gap-4",
          className,
        )}
      >
        <AlertCircle className="size-10 text-muted-foreground" />
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
      <AudioPaywallOverlay
        creator={creator}
        artwork={artwork}
        title={title}
        creatorName={creatorName}
        className={className}
      />
    );
  }

  // Render audio player
  if (!mediaUrl) {
    return null;
  }

  return (
    <AudioPlayer
      src={mediaUrl}
      title={title}
      duration={duration}
      contentId={contentId}
      initialPosition={initialPosition}
      artwork={artwork}
      creatorName={creatorName}
      onPlay={handlePlay}
      onPause={handlePause}
      onEnded={handleEnded}
      className={className}
    />
  );
}

/**
 * Audio paywall overlay component
 */
interface AudioPaywallOverlayProps {
  creator: CreatorPaywallInfo | null;
  artwork?: string | null;
  title: string;
  creatorName?: string;
  className?: string;
}

function AudioPaywallOverlay({
  creator,
  artwork,
  title,
  creatorName,
  className,
}: AudioPaywallOverlayProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-4">
        {/* Artwork / Lock Icon */}
        <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-muted relative">
          {artwork ? (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center blur-sm scale-110 opacity-50"
                style={{ backgroundImage: `url(${artwork})` }}
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Lock className="size-6 text-white" />
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <Music className="size-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">{title}</h3>
          {creatorName && (
            <p className="text-sm text-muted-foreground truncate">
              {creatorName}
            </p>
          )}

          {creator && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <a
                href={`/${creator.handle}?subscribe=true`}
                className={cn(buttonVariants({ size: "lg" }), "min-h-[44px]")}
              >
                <Lock className="size-3 mr-1" />
                Subscribe {creator.subscriptionPrice.amount}/mo
              </a>
              {creator.trialEnabled && (
                <span className="text-xs text-muted-foreground">
                  7-day free trial
                </span>
              )}
            </div>
          )}

          {!creator && (
            <p className="text-sm text-muted-foreground mt-2">
              Sign in to listen
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
