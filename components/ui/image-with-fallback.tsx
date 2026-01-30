"use client";

import { useState } from "react";
import Image, { ImageProps } from "next/image";
import { cn } from "@/lib/utils";

/**
 * ImageWithFallback - A client component that handles image loading errors gracefully
 *
 * When an image fails to load, it displays a customizable fallback UI instead of
 * showing a broken image icon. This is particularly useful for user-generated
 * content or external images that may not always be available.
 */
export interface ImageWithFallbackProps
  extends Omit<ImageProps, "onError" | "src"> {
  /** The image source URL */
  src: string | null | undefined;
  /** Fallback element to display when image fails to load or src is empty */
  fallback?: React.ReactNode;
  /** Additional wrapper class names */
  wrapperClassName?: string;
}

export function ImageWithFallback({
  src,
  alt,
  fallback,
  wrapperClassName,
  className,
  ...props
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);

  // If no src provided or image has errored, show fallback
  if (!src || hasError) {
    return (
      <div
        className={cn("relative", wrapperClassName)}
        role="img"
        aria-label={alt}
      >
        {fallback || <DefaultFallback />}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      {...props}
    />
  );
}

/**
 * Default fallback when no custom fallback is provided
 */
function DefaultFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-muted">
      <svg
        className="size-8 text-muted-foreground/50"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
        />
      </svg>
    </div>
  );
}

/**
 * Thumbnail with fallback - Specifically designed for content thumbnails
 *
 * Shows the appropriate type icon when an image is unavailable.
 */
export interface ThumbnailWithFallbackProps extends ImageWithFallbackProps {
  /** Content type for displaying the appropriate fallback icon */
  contentType?: "video" | "audio" | "text";
}

export function ThumbnailWithFallback({
  contentType = "video",
  ...props
}: ThumbnailWithFallbackProps) {
  const TypeIcon = {
    video: (
      <svg
        className="size-6 text-muted-foreground/60"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
        />
      </svg>
    ),
    audio: (
      <svg
        className="size-6 text-muted-foreground/60"
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
    text: (
      <svg
        className="size-6 text-muted-foreground/60"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
        />
      </svg>
    ),
  }[contentType];

  return (
    <ImageWithFallback
      {...props}
      fallback={
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-accent/30">
          {TypeIcon}
        </div>
      }
    />
  );
}
