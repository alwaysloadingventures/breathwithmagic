"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { ImageIcon, X, AlertCircle, Upload, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Upload status types
 */
type UploadStatus = "idle" | "preparing" | "uploading" | "complete" | "error";

/**
 * Note: Modern browsers automatically handle EXIF orientation via
 * CSS image-orientation: from-image (default in all modern browsers).
 * No additional JavaScript processing is needed for camera-captured images.
 *
 * The accept="image/*" attribute with capture on mobile devices will
 * trigger the camera app, which properly saves orientation metadata.
 */

/**
 * ThumbnailUploader Props
 */
interface ThumbnailUploaderProps {
  contentId?: string;
  purpose?: "thumbnail" | "avatar" | "cover";
  currentUrl?: string | null;
  onUploadComplete?: (r2Key: string, publicUrl?: string) => void;
  onRemove?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
  aspectRatio?: "video" | "square" | "banner";
  /** Enable camera capture on mobile devices */
  enableCamera?: boolean;
  /** Camera capture mode: "user" for selfie, "environment" for rear camera */
  cameraMode?: "user" | "environment";
}

/**
 * ThumbnailUploader Component
 *
 * Handles image uploads to Cloudflare R2 for thumbnails, avatars, and covers.
 * Shows upload progress and preview.
 */
export function ThumbnailUploader({
  contentId,
  purpose = "thumbnail",
  currentUrl,
  onUploadComplete,
  onRemove,
  onError,
  disabled = false,
  className,
  aspectRatio = "video",
  enableCamera = false,
  cameraMode = "environment",
}: ThumbnailUploaderProps) {
  const [status, setStatus] = useState<UploadStatus>(
    currentUrl ? "complete" : "idle",
  );
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentUrl || null,
  );

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
          type: "image",
          contentId,
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
          purpose,
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
   * Upload image file using presigned URL
   */
  const uploadImage = async (
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
      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!validTypes.includes(file.type)) {
        setErrorMessage(
          "Please select a valid image (JPEG, PNG, WebP, or GIF)",
        );
        onError?.("Invalid image format");
        return;
      }

      // Validate file size (max 2MB)
      const maxSize = 2 * 1024 * 1024;
      if (file.size > maxSize) {
        setErrorMessage("Image must be less than 2MB");
        onError?.("Image file too large");
        return;
      }

      // Create preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setErrorMessage(null);
      setStatus("preparing");

      try {
        // Get presigned upload URL
        const result = await getUploadUrl(file);
        if (!result) {
          setStatus("error");
          return;
        }

        setStatus("uploading");

        // Upload the image
        await uploadImage(file, result.uploadUrl);

        setStatus("complete");
        onUploadComplete?.(result.key);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload failed";
        setErrorMessage(message);
        setStatus("error");
        onError?.(message);
        // Clean up preview on error
        URL.revokeObjectURL(objectUrl);
        setPreviewUrl(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- helper functions use stable setters
    [contentId, purpose, onUploadComplete, onError],
  );

  /**
   * Handle remove
   */
  const handleRemove = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setStatus("idle");
    setProgress(0);
    setErrorMessage(null);
    onRemove?.();
  };

  /**
   * Get aspect ratio class
   */
  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case "video":
        return "aspect-video";
      case "square":
        return "aspect-square";
      case "banner":
        return "aspect-[3/1]";
      default:
        return "aspect-video";
    }
  };

  /**
   * Get label based on purpose
   */
  const getLabel = () => {
    switch (purpose) {
      case "avatar":
        return "Profile photo";
      case "cover":
        return "Cover image";
      default:
        return "Thumbnail";
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-lg border-2 border-dashed transition-colors",
          getAspectRatioClass(),
          status === "idle" && !disabled
            ? "border-border hover:border-primary/50"
            : "border-border",
          status === "error" && "border-destructive/50",
          status === "complete" && previewUrl && "border-transparent",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        {/* Preview image */}
        {previewUrl ? (
          <>
            <Image
              src={previewUrl}
              alt={getLabel()}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 640px"
            />

            {/* Remove button */}
            {!disabled && (
              <Button
                variant="secondary"
                size="icon-sm"
                className="absolute right-2 top-2 shadow-md"
                onClick={handleRemove}
                aria-label={`Remove ${getLabel().toLowerCase()}`}
              >
                <X className="size-4" />
              </Button>
            )}

            {/* Uploading overlay */}
            {status === "uploading" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-center text-white">
                  <Upload className="mx-auto size-8 animate-pulse" />
                  <p className="mt-2 text-sm">{progress}%</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Upload input - supports camera capture on mobile */}
            <input
              type="file"
              accept="image/*"
              capture={enableCamera ? cameraMode : undefined}
              onChange={handleFileSelect}
              disabled={disabled || status === "uploading"}
              className="absolute inset-0 z-10 cursor-pointer opacity-0 min-h-[44px]"
              aria-label={`Upload ${getLabel().toLowerCase()}${enableCamera ? " or take photo" : ""}`}
            />

            {/* Placeholder */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
              {status === "error" ? (
                <>
                  <AlertCircle className="size-8 text-destructive" />
                  <p className="text-center text-sm text-destructive">
                    {errorMessage}
                  </p>
                </>
              ) : (
                <>
                  {enableCamera ? (
                    <Camera className="size-8 text-muted-foreground" />
                  ) : (
                    <ImageIcon className="size-8 text-muted-foreground" />
                  )}
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      {enableCamera
                        ? `Tap to take ${purpose === "avatar" ? "a photo" : `${getLabel().toLowerCase()} photo`}`
                        : `Click to upload ${getLabel().toLowerCase()}`}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {enableCamera ? "Or choose from library" : "JPEG, PNG, WebP, or GIF (max 2MB)"}
                    </p>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
