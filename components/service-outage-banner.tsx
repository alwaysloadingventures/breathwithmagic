"use client";

import { useState, useEffect } from "react";
import { AlertCircle, RefreshCw, WifiOff, X } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * ServiceOutageBanner - Display service outage notifications
 *
 * Shows a calm, informative banner when services are unavailable.
 * Can be dismissed by the user.
 *
 * Usage:
 * ```tsx
 * <ServiceOutageBanner
 *   service="payments"
 *   title="Payments temporarily unavailable"
 *   message="We're having trouble processing payments."
 * />
 * ```
 */
export interface ServiceOutageBannerProps {
  /** Service identifier */
  service: "database" | "storage" | "payments" | "general";
  /** Banner title */
  title: string;
  /** Detailed message */
  message: string;
  /** Optional action text */
  actionText?: string;
  /** Whether the banner can be dismissed */
  dismissible?: boolean;
  /** Callback when dismissed */
  onDismiss?: () => void;
  /** Auto-retry function */
  onRetry?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function ServiceOutageBanner({
  service,
  title,
  message,
  actionText,
  dismissible = true,
  onDismiss,
  onRetry,
  className,
}: ServiceOutageBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  // Service-specific styling
  const isNetworkError = service === "database" || service === "general";
  const Icon = isNetworkError ? WifiOff : AlertCircle;

  return (
    <Alert
      className={cn(
        "relative border-muted-foreground/20 bg-muted/50",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Icon className="size-4 text-muted-foreground" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p className="mb-3">{message}</p>
        {(actionText || onRetry) && (
          <div className="flex gap-2">
            {onRetry && (
              <Button onClick={onRetry} variant="secondary" size="sm">
                <RefreshCw className="size-4 mr-2" aria-hidden="true" />
                {actionText || "Try again"}
              </Button>
            )}
          </div>
        )}
      </AlertDescription>
      {dismissible && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 size-8"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </Button>
      )}
    </Alert>
  );
}

/**
 * OfflineBanner - Shows when the user is offline
 *
 * Automatically appears/disappears based on navigator.onLine
 */
export function OfflineBanner() {
  // Initialize from navigator.onLine on first render
  const [isOffline, setIsOffline] = useState(() => {
    // SSR safety check
    if (typeof navigator === "undefined") return false;
    return !navigator.onLine;
  });

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50"
      role="alert"
      aria-live="assertive"
    >
      <Alert className="border-border bg-muted/50 shadow-lg">
        <WifiOff className="size-4 text-muted-foreground" />
        <AlertTitle>You&apos;re offline</AlertTitle>
        <AlertDescription>
          Some features may not work until you reconnect to the internet.
        </AlertDescription>
      </Alert>
    </div>
  );
}

/**
 * MaintenanceBanner - Shows when the site is in maintenance mode
 */
export interface MaintenanceBannerProps {
  /** Estimated time of completion (optional) */
  estimatedEnd?: Date;
  /** Additional message */
  message?: string;
  className?: string;
}

export function MaintenanceBanner({
  estimatedEnd,
  message,
  className,
}: MaintenanceBannerProps) {
  const formattedTime = estimatedEnd
    ? estimatedEnd.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <Alert
      className={cn(
        "border-primary/20 bg-primary/5",
        className,
      )}
      role="status"
    >
      <AlertCircle className="size-4 text-primary" />
      <AlertTitle>Scheduled maintenance</AlertTitle>
      <AlertDescription>
        <p>
          {message ||
            "We're making some improvements. Everything will be back to normal shortly."}
        </p>
        {formattedTime && (
          <p className="mt-1 text-sm">
            Estimated completion: {formattedTime}
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}
