"use client";

/**
 * AudioPlayer - Custom HTML5 audio player component
 *
 * Features:
 * - Progress bar with seek
 * - Play/pause toggle
 * - Volume control
 * - Playback speed (0.5x-2x)
 * - Progress saving (debounced every 30 seconds)
 * - Keyboard shortcuts
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";

interface AudioPlayerProps {
  /** Audio file URL */
  src: string;
  /** Track title */
  title: string;
  /** Total duration in seconds */
  duration?: number | null;
  /** Content ID for progress saving */
  contentId: string;
  /** Initial playback position in seconds */
  initialPosition?: number;
  /** Thumbnail/artwork URL */
  artwork?: string | null;
  /** Creator name */
  creatorName?: string;
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

export function AudioPlayer({
  src,
  title,
  duration,
  contentId,
  initialPosition = 0,
  artwork,
  creatorName,
  onPlay,
  onPause,
  onEnded,
  className,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(initialPosition);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [announcement, setAnnouncement] = useState("");

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
      if (audioRef.current && !audioRef.current.paused) {
        saveProgress(audioRef.current.currentTime);
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
    const audioElement = audioRef.current;
    return () => {
      stopProgressTimer();
      // Save final progress on unmount
      if (audioElement) {
        saveProgress(audioElement.currentTime);
      }
    };
  }, [stopProgressTimer, saveProgress]);

  // Handle play/pause
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  }, [isPlaying]);

  // Handle mute/unmute
  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    audioRef.current.muted = newMuted;
    setIsMuted(newMuted);
    setAnnouncement(newMuted ? "Muted" : "Unmuted");
  }, [isMuted]);

  // Handle volume change
  const handleVolumeChange = useCallback(
    (value: number | readonly number[]) => {
      if (!audioRef.current) return;
      const newVolume = Array.isArray(value) ? value[0] : value;
      audioRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
      setAnnouncement(`Volume ${Math.round(newVolume * 100)}%`);
    },
    [],
  );

  // Handle seek
  const handleSeek = useCallback((value: number | readonly number[]) => {
    if (!audioRef.current) return;
    const time = Array.isArray(value) ? value[0] : value;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  // Skip forward/backward
  const skip = useCallback(
    (seconds: number) => {
      if (!audioRef.current) return;
      audioRef.current.currentTime = Math.max(
        0,
        Math.min(audioDuration, audioRef.current.currentTime + seconds),
      );
    },
    [audioDuration],
  );

  // Handle playback speed change
  const handleSpeedChange = useCallback((speed: number) => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
    setAnnouncement(`Playback speed ${speed}x`);
  }, []);

  // Audio event handlers
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
    if (audioRef.current) {
      saveProgress(audioRef.current.currentTime);
    }
    onPause?.();
  }, [stopProgressTimer, saveProgress, onPause]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    stopProgressTimer();
    saveProgress(audioDuration, true);
    onEnded?.();
  }, [stopProgressTimer, saveProgress, audioDuration, onEnded]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
      if (initialPosition > 0) {
        audioRef.current.currentTime = initialPosition;
      }
    }
    setIsLoading(false);
  }, [initialPosition]);

  const handleWaiting = useCallback(() => {
    setIsLoading(true);
  }, []);

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Format time display
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl p-4 shadow-sm",
        className,
      )}
      role="region"
      aria-label={`Audio player: ${title}`}
      aria-roledescription="audio player with custom controls"
    >
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={src}
        aria-label={creatorName ? `${title} by ${creatorName}` : title}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        preload="metadata"
      />

      {/* Screen Reader Announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Player Layout */}
      <div className="flex items-center gap-4">
        {/* Artwork */}
        {artwork && (
          <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-muted relative">
            <Image
              src={artwork}
              alt={title}
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
        )}

        {/* Main Controls */}
        <div className="flex-1 min-w-0">
          {/* Title and Creator */}
          <div className="mb-2">
            <h3 className="font-medium text-foreground truncate">{title}</h3>
            {creatorName && (
              <p className="text-sm text-muted-foreground truncate">
                {creatorName}
              </p>
            )}
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs text-muted-foreground w-12 text-right">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              min={0}
              max={audioDuration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="flex-1"
              aria-label="Audio progress"
            />
            <span className="text-xs text-muted-foreground w-12">
              {formatTime(audioDuration)}
            </span>
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {/* Skip Back */}
              <Button
                variant="ghost"
                size="sm"
                className="min-w-[44px] min-h-[44px]"
                onClick={() => skip(-15)}
                aria-label="Skip back 15 seconds"
              >
                <SkipBack className="size-4" />
              </Button>

              {/* Play/Pause */}
              <Button
                variant="default"
                size="sm"
                className="min-w-[44px] min-h-[44px] rounded-full"
                onClick={togglePlay}
                disabled={isLoading}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4 ml-0.5" />
                )}
              </Button>

              {/* Skip Forward */}
              <Button
                variant="ghost"
                size="sm"
                className="min-w-[44px] min-h-[44px]"
                onClick={() => skip(15)}
                aria-label="Skip forward 15 seconds"
              >
                <SkipForward className="size-4" />
              </Button>
            </div>

            <div className="flex items-center gap-1">
              {/* Volume - Button always visible, slider only on desktop */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-w-[44px] min-h-[44px]"
                  onClick={toggleMute}
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="size-4" />
                  ) : (
                    <Volume2 className="size-4" />
                  )}
                </Button>
                <div className="hidden sm:block">
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    min={0}
                    max={1}
                    step={0.01}
                    onValueChange={handleVolumeChange}
                    className="w-20"
                    aria-label="Volume"
                  />
                </div>
              </div>

              {/* Playback Speed */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-xs font-medium rounded-md hover:bg-muted"
                  aria-label={`Playback speed: ${playbackSpeed}x`}
                >
                  {playbackSpeed}x
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <DropdownMenuItem
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={cn(
                        "cursor-pointer",
                        playbackSpeed === speed && "bg-accent",
                      )}
                    >
                      {speed}x
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
