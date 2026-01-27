"use client";

import { useState, useCallback } from "react";
import { Upload, Video, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

/**
 * Upload status types
 */
type UploadStatus =
  | "idle"
  | "preparing"
  | "uploading"
  | "processing"
  | "complete"
  | "error";

/**
 * VideoUploader Props
 */
interface VideoUploaderProps {
  contentId: string;
  onUploadComplete?: (videoUid: string, duration?: number) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * VideoUploader Component
 *
 * Handles video uploads to Cloudflare Stream using TUS protocol.
 * Shows upload progress and processing status.
 */
export function VideoUploader({
  contentId,
  onUploadComplete,
  onError,
  disabled = false,
  className,
}: VideoUploaderProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUid, setVideoUid] = useState<string | null>(null);

  /**
   * Get upload URL from our API
   */
  const getUploadUrl = async (): Promise<{
    uploadUrl: string;
    videoUid: string;
  } | null> => {
    try {
      const response = await fetch("/api/creator/content/video-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId,
          maxDurationSeconds: 3600, // 1 hour max
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to get upload URL");
      }

      const data = await response.json();
      return { uploadUrl: data.uploadUrl, videoUid: data.videoUid };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get upload URL";
      setErrorMessage(message);
      onError?.(message);
      return null;
    }
  };

  /**
   * Upload video using fetch (simplified - TUS would need tus-js-client)
   * For production, consider using @uppy/tus or tus-js-client for resumable uploads
   */
  const uploadVideo = async (
    file: File,
    uploadUrl: string,
  ): Promise<boolean> => {
    try {
      setStatus("uploading");
      setProgress(0);

      // For Cloudflare Stream direct creator uploads, we use a simple PUT request
      // The uploadUrl already contains authentication
      const xhr = new XMLHttpRequest();

      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round(
              (event.loaded / event.total) * 100,
            );
            setProgress(percentComplete);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(true);
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Network error during upload"));
        });

        xhr.open("POST", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
        xhr.send(file);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      throw new Error(message);
    }
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      const validTypes = [
        "video/mp4",
        "video/webm",
        "video/quicktime",
        "video/x-msvideo",
      ];
      if (!validTypes.includes(file.type)) {
        setErrorMessage(
          "Please select a valid video file (MP4, WebM, MOV, or AVI)",
        );
        onError?.("Invalid video format");
        return;
      }

      // Validate file size (max 4GB for Cloudflare Stream)
      const maxSize = 4 * 1024 * 1024 * 1024; // 4GB
      if (file.size > maxSize) {
        setErrorMessage("Video file must be less than 4GB");
        onError?.("Video file too large");
        return;
      }

      setSelectedFile(file);
      setErrorMessage(null);
      setStatus("preparing");

      try {
        // Get upload URL from our API
        const result = await getUploadUrl();
        if (!result) {
          setStatus("error");
          return;
        }

        setVideoUid(result.videoUid);

        // Upload the video
        await uploadVideo(file, result.uploadUrl);

        setStatus("processing");

        // Wait a moment for processing to start, then complete
        // In production, you'd poll the Stream API for status
        setTimeout(() => {
          setStatus("complete");
          onUploadComplete?.(result.videoUid);
        }, 2000);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload failed";
        setErrorMessage(message);
        setStatus("error");
        onError?.(message);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getUploadUrl and uploadVideo use stable setters
    [contentId, onUploadComplete, onError],
  );

  /**
   * Reset uploader
   */
  const handleReset = () => {
    setStatus("idle");
    setProgress(0);
    setErrorMessage(null);
    setSelectedFile(null);
    setVideoUid(null);
  };

  /**
   * Get status message
   */
  const getStatusMessage = () => {
    switch (status) {
      case "preparing":
        return "Preparing upload...";
      case "uploading":
        return `Uploading... ${progress}%`;
      case "processing":
        return "Processing video...";
      case "complete":
        return "Upload complete";
      case "error":
        return errorMessage || "Upload failed";
      default:
        return null;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload area */}
      <div
        className={cn(
          "relative flex min-h-[200px] flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
          status === "idle" && !disabled
            ? "border-border hover:border-primary/50 hover:bg-primary/5"
            : "border-border",
          status === "error" && "border-destructive/50 bg-destructive/5",
          status === "complete" && "border-primary/50 bg-primary/5",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        {status === "idle" ? (
          <>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
              onChange={handleFileSelect}
              disabled={disabled}
              className="absolute inset-0 z-10 cursor-pointer opacity-0"
              aria-label="Select video file"
            />
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Video className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Click to upload or drag and drop</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  MP4, WebM, MOV, or AVI (max 4GB)
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex w-full flex-col items-center gap-4">
            {/* Status icon */}
            <div
              className={cn(
                "flex size-12 items-center justify-center rounded-full",
                status === "error" ? "bg-destructive/10" : "bg-muted",
              )}
            >
              {status === "error" ? (
                <AlertCircle className="size-6 text-destructive" />
              ) : status === "complete" ? (
                <CheckCircle className="size-6 text-primary" />
              ) : (
                <Upload className="size-6 animate-pulse text-muted-foreground" />
              )}
            </div>

            {/* File name */}
            {selectedFile && (
              <p className="max-w-full truncate text-sm font-medium">
                {selectedFile.name}
              </p>
            )}

            {/* Progress bar */}
            {(status === "uploading" || status === "processing") && (
              <div className="w-full max-w-xs">
                <Progress
                  value={status === "processing" ? 100 : progress}
                  className="h-2"
                />
              </div>
            )}

            {/* Status message */}
            <p
              className={cn(
                "text-sm",
                status === "error"
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            >
              {getStatusMessage()}
            </p>

            {/* Reset button */}
            {(status === "error" || status === "complete") && (
              <Button variant="outline" size="sm" onClick={handleReset}>
                {status === "error" ? "Try again" : "Upload another"}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Video UID display (for debugging/reference) */}
      {videoUid && status === "complete" && (
        <p className="text-xs text-muted-foreground">Video ID: {videoUid}</p>
      )}
    </div>
  );
}
