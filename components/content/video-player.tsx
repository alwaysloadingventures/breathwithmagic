"use client";

/**
 * VideoPlayer - Cloudflare Stream video player component
 *
 * Features:
 * - Lazy loaded with next/dynamic
 * - Progress saving (debounced every 30 seconds)
 * - Playback speed controls (0.5x-2x)
 * - Picture-in-picture support
 * - Fullscreen support
 * - Captions support (if available)
 * - Keyboard shortcuts
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  PictureInPicture2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";

interface VideoPlayerProps {
  /** Cloudflare Stream video URL or video ID */
  src: string;
  /** Poster/thumbnail image URL */
  poster?: string | null;
  /** Video title for accessibility */
  title: string;
  /** Total duration in seconds */
  duration?: number | null;
  /** Content ID for progress saving */
  contentId: string;
  /** Initial playback position in seconds */
  initialPosition?: number;
  /** Callback when playback starts */
  onPlay?: () => void;
  /** Callback when playback pauses */
  onPause?: () => void;
  /** Callback when playback ends */
  onEnded?: () => void;
  /** Custom className */
  className?: string;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const PROGRESS_SAVE_INTERVAL = 30000; // 30 seconds

export function VideoPlayer({
  src,
  poster,
  title,
  duration,
  contentId,
  initialPosition = 0,
  onPlay,
  onPause,
  onEnded,
  className,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(initialPosition);
  const [videoDuration, setVideoDuration] = useState(duration || 0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [controlsHaveFocus, setControlsHaveFocus] = useState(false);

  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  // Save progress to server
  const saveProgress = useCallback(
    async (time: number, completed = false) => {
      try {
        await fetch(`/api/content/${contentId}/view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            watchDuration: Math.floor(time),
            completed,
          }),
        });
      } catch (error) {
        console.error("Failed to save progress:", error);
      }
    },
    [contentId],
  );

  // Start progress save timer
  const startProgressTimer = useCallback(() => {
    if (progressSaveTimerRef.current) {
      clearInterval(progressSaveTimerRef.current);
    }
    progressSaveTimerRef.current = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        saveProgress(videoRef.current.currentTime);
      }
    }, PROGRESS_SAVE_INTERVAL);
  }, [saveProgress]);

  // Stop progress save timer
  const stopProgressTimer = useCallback(() => {
    if (progressSaveTimerRef.current) {
      clearInterval(progressSaveTimerRef.current);
      progressSaveTimerRef.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    const videoElement = videoRef.current;
    return () => {
      stopProgressTimer();
      // Save final progress on unmount
      if (videoElement) {
        saveProgress(videoElement.currentTime);
      }
    };
  }, [stopProgressTimer, saveProgress]);

  // Handle play/pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  }, [isPlaying]);

  // Handle mute/unmute
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
    setAnnouncement(newMuted ? "Muted" : "Unmuted");
  }, [isMuted]);

  // Handle volume change
  const handleVolumeChange = useCallback(
    (value: number | readonly number[]) => {
      if (!videoRef.current) return;
      const newVolume = Array.isArray(value) ? value[0] : value;
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
      setAnnouncement(`Volume ${Math.round(newVolume * 100)}%`);
    },
    [],
  );

  // Handle seek
  const handleSeek = useCallback((value: number | readonly number[]) => {
    if (!videoRef.current) return;
    const time = Array.isArray(value) ? value[0] : value;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  // Handle playback speed change
  const handleSpeedChange = useCallback((speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
    setAnnouncement(`Playback speed ${speed}x`);
  }, []);

  // Handle fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (error) {
        console.error("Failed to enter fullscreen:", error);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (error) {
        console.error("Failed to exit fullscreen:", error);
      }
    }
  }, [isFullscreen]);

  // Handle picture-in-picture
  const togglePiP = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error("Failed to toggle PiP:", error);
    }
  }, []);

  // Handle controls visibility
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    // Don't auto-hide if controls have keyboard focus
    if (isPlaying && !controlsHaveFocus) {
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying, controlsHaveFocus]);

  // Video event handlers
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    setAnnouncement("Playing");
    startProgressTimer();
    onPlay?.();
  }, [startProgressTimer, onPlay]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    setAnnouncement("Paused");
    stopProgressTimer();
    if (videoRef.current) {
      saveProgress(videoRef.current.currentTime);
    }
    onPause?.();
  }, [stopProgressTimer, saveProgress, onPause]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    stopProgressTimer();
    saveProgress(videoDuration, true);
    onEnded?.();
  }, [stopProgressTimer, saveProgress, videoDuration, onEnded]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
      if (initialPosition > 0) {
        videoRef.current.currentTime = initialPosition;
      }
    }
  }, [initialPosition]);

  const handleWaiting = useCallback(() => {
    setIsBuffering(true);
  }, []);

  const handleCanPlay = useCallback(() => {
    setIsBuffering(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "arrowleft":
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(
              0,
              videoRef.current.currentTime - 10,
            );
          }
          break;
        case "arrowright":
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(
              videoDuration,
              videoRef.current.currentTime + 10,
            );
          }
          break;
        case "arrowup":
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.volume = Math.min(
              1,
              videoRef.current.volume + 0.1,
            );
            setVolume(videoRef.current.volume);
          }
          break;
        case "arrowdown":
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.volume = Math.max(
              0,
              videoRef.current.volume - 0.1,
            );
            setVolume(videoRef.current.volume);
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, toggleMute, toggleFullscreen, videoDuration]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative bg-black rounded-lg overflow-hidden group",
        isFullscreen ? "fixed inset-0 z-50" : "aspect-video",
        className,
      )}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      role="region"
      aria-label={`Video player: ${title}`}
      aria-roledescription="video player with custom controls"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        src={src}
        poster={poster || undefined}
        playsInline
        aria-hidden="true"
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        onClick={togglePlay}
      >
        Your browser does not support the video tag.
      </video>

      {/* Screen Reader Announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className={cn(
          "absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onFocus={() => setControlsHaveFocus(true)}
        onBlur={() => setControlsHaveFocus(false)}
      >
        {/* Progress Bar */}
        <div className="px-4 pb-2">
          <Slider
            value={[currentTime]}
            min={0}
            max={videoDuration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="h-1 cursor-pointer"
            aria-label="Video progress"
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center gap-2 px-4 pb-4">
          {/* Play/Pause */}
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 min-w-[44px] min-h-[44px]"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="size-5" />
            ) : (
              <Play className="size-5" />
            )}
          </Button>

          {/* Volume */}
          <div className="flex items-center gap-1 group/volume">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 min-w-[44px] min-h-[44px]"
              onClick={toggleMute}
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="size-5" />
              ) : (
                <Volume2 className="size-5" />
              )}
            </Button>
            <div className="w-0 overflow-hidden group-hover/volume:w-24 focus-within:w-24 transition-all duration-200">
              <Slider
                value={[isMuted ? 0 : volume]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                className="w-20 h-1"
                aria-label="Volume"
              />
            </div>
          </div>

          {/* Time Display */}
          <div className="text-white text-sm ml-3 mr-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {formatTime(currentTime)} / {formatTime(videoDuration)}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Playback Speed */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex items-center justify-center text-white hover:bg-white/20 min-w-[44px] min-h-[44px] rounded-md"
              aria-label={`Playback speed: ${playbackSpeed}x`}
            >
              <Settings className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-background/95 backdrop-blur-sm border border-border"
            >
              {PLAYBACK_SPEEDS.map((speed) => (
                <DropdownMenuItem
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={cn(
                    "text-white hover:bg-white/20 cursor-pointer",
                    playbackSpeed === speed && "bg-white/10",
                  )}
                >
                  {speed}x
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Picture-in-Picture */}
          {document.pictureInPictureEnabled && (
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 min-w-[44px] min-h-[44px]"
              onClick={togglePiP}
              aria-label="Picture in picture"
            >
              <PictureInPicture2 className="size-5" />
            </Button>
          )}

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 min-w-[44px] min-h-[44px]"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <Minimize className="size-5" />
            ) : (
              <Maximize className="size-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Big Play Button (when paused) */}
      {!isPlaying && !isBuffering && (
        <button
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
          aria-label="Play video"
        >
          <div className="w-20 h-20 bg-primary/90 rounded-full flex items-center justify-center hover:bg-primary transition-colors">
            <Play
              className="size-10 text-primary-foreground ml-1"
              fill="currentColor"
            />
          </div>
        </button>
      )}
    </div>
  );
}
