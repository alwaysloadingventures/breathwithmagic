"use client";

import { useState, useCallback } from "react";
import { Headphones, AlertCircle, CheckCircle, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

/**
 * Upload status types
 */
type UploadStatus = "idle" | "preparing" | "uploading" | "complete" | "error";

/**
 * AudioUploader Props
 */
interface AudioUploaderProps {
  contentId: string;
  onUploadComplete?: (r2Key: string, duration?: number) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Get audio duration from file
 */
async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src);
      resolve(Math.floor(audio.duration));
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audio.src);
      reject(new Error("Failed to load audio metadata"));
    };

    audio.src = URL.createObjectURL(file);
  });
}

/**
 * AudioUploader Component
 *
 * Handles audio uploads to Cloudflare R2 using presigned URLs.
 * Shows upload progress and extracts duration metadata.
 */
export function AudioUploader({
  contentId,
  onUploadComplete,
  onError,
  disabled = false,
  className,
}: AudioUploaderProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  /**
   * Get presigned upload URL from our API
   */
  const getUploadUrl = async (
    file: File,
  ): Promise<{ uploadUrl: string; key: string } | null> => {
    try {
      const response = await fetch("/api/creator/content/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "audio",
          contentId,
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to get upload URL");
      }

      const data = await response.json();
      return { uploadUrl: data.uploadUrl, key: data.key };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get upload URL";
      setErrorMessage(message);
      onError?.(message);
      return null;
    }
  };

  /**
   * Upload audio file using presigned URL
   */
  const uploadAudio = async (
    file: File,
    uploadUrl: string,
  ): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

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

      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });
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
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/ogg",
        "audio/aac",
        "audio/m4a",
        "audio/x-m4a",
      ];
      if (!validTypes.includes(file.type)) {
        setErrorMessage(
          "Please select a valid audio file (MP3, WAV, OGG, AAC, or M4A)",
        );
        onError?.("Invalid audio format");
        return;
      }

      // Validate file size (max 100MB)
      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        setErrorMessage("Audio file must be less than 100MB");
        onError?.("Audio file too large");
        return;
      }

      setSelectedFile(file);
      setErrorMessage(null);
      setStatus("preparing");

      try {
        // Get audio duration
        let duration: number | undefined;
        try {
          duration = await getAudioDuration(file);
        } catch {
          console.warn("Could not extract audio duration");
        }

        // Get presigned upload URL
        const result = await getUploadUrl(file);
        if (!result) {
          setStatus("error");
          return;
        }

        setStatus("uploading");

        // Upload the audio
        await uploadAudio(file, result.uploadUrl);

        setStatus("complete");
        onUploadComplete?.(result.key, duration);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload failed";
        setErrorMessage(message);
        setStatus("error");
        onError?.(message);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- helper functions use stable setters
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
              accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/aac,audio/m4a,audio/x-m4a"
              onChange={handleFileSelect}
              disabled={disabled}
              className="absolute inset-0 z-10 cursor-pointer opacity-0"
              aria-label="Select audio file"
            />
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Headphones className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Click to upload or drag and drop</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  MP3, WAV, OGG, AAC, or M4A (max 100MB)
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
            {status === "uploading" && (
              <div className="w-full max-w-xs">
                <Progress value={progress} className="h-2" />
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
    </div>
  );
}
