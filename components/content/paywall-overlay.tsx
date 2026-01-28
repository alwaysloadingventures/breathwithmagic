"use client";

/**
 * PaywallOverlay - Blurred content preview with subscription CTA
 *
 * Displays a blurred thumbnail with lock icon and subscription prompt
 * for content that requires a paid subscription.
 */

import Link from "next/link";
import Image from "next/image";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/lib/button-variants";

interface PaywallOverlayProps {
  /** Thumbnail URL to blur */
  thumbnailUrl?: string | null;
  /** Creator handle for subscription link */
  creatorHandle: string;
  /** Subscription price display (e.g., "$10") */
  price: string;
  /** Whether trial is available */
  trialEnabled?: boolean;
  /** Whether user is authenticated */
  isAuthenticated?: boolean;
  /** Content title for accessibility */
  contentTitle?: string;
  /** Custom className */
  className?: string;
}

export function PaywallOverlay({
  thumbnailUrl,
  creatorHandle,
  price,
  trialEnabled = false,
  isAuthenticated = false,
  contentTitle,
  className,
}: PaywallOverlayProps) {
  const subscribeUrl = isAuthenticated
    ? `/${creatorHandle}?subscribe=true`
    : `/sign-up?redirect_url=/${creatorHandle}`;

  return (
    <div
      className={cn(
        "relative aspect-video bg-muted rounded-lg overflow-hidden",
        className,
      )}
    >
      {/* Blurred Background */}
      {thumbnailUrl ? (
        <Image
          src={thumbnailUrl}
          alt={contentTitle ? `Preview of ${contentTitle}` : "Content preview"}
          fill
          className="object-cover blur-xl scale-110"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-accent/30" />
      )}

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-md" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
        {/* Lock Icon */}
        <div className="w-16 h-16 rounded-full bg-background/80 flex items-center justify-center mb-4 shadow-lg">
          <Lock className="w-8 h-8 text-foreground" />
        </div>

        {/* Message */}
        <p className="text-foreground font-medium mb-1">Subscribe to unlock</p>
        <p className="text-muted-foreground text-sm mb-4">
          {price}/month{" "}
          <span className="text-muted-foreground/70"> Cancel anytime</span>
        </p>

        {/* CTA Button */}
        <Link
          href={subscribeUrl}
          className={cn(
            buttonVariants({ size: "lg" }),
            "min-h-[44px] min-w-[160px]",
          )}
        >
          {trialEnabled ? "Start free trial" : `Subscribe for ${price}/month`}
        </Link>

        {/* Trial Note */}
        {trialEnabled && (
          <p className="text-xs text-muted-foreground mt-2">
            7 days free, then {price}/month
          </p>
        )}
      </div>
    </div>
  );
}
