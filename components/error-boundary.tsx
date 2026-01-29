"use client";

import { Component, type ReactNode } from "react";
import { AlertCircle, RefreshCw, WifiOff, CreditCard, ImageOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Error types for specific fallback UI
 */
export type ErrorType = "generic" | "network" | "payment" | "media" | "data";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Type of error for specific fallback UI */
  type?: ErrorType;
  /** Custom fallback component */
  fallback?: ReactNode;
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Reset key to recover from errors */
  resetKey?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary Component
 *
 * A React error boundary that catches errors in child components
 * and displays a friendly fallback UI.
 *
 * Features:
 * - Type-specific error messages (network, payment, media, etc.)
 * - Custom fallback support
 * - Error logging callback
 * - Recovery via reset button or resetKey prop
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary type="payment">
 *   <PaymentForm />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console (production would send to monitoring)
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Call optional onError callback
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error state when resetKey changes
    if (
      this.state.hasError &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Use type-specific fallback
      return (
        <ErrorFallback
          type={this.props.type || "generic"}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Error fallback configurations by type
 */
const ERROR_CONFIGS: Record<
  ErrorType,
  {
    icon: typeof AlertCircle;
    title: string;
    message: string;
    showRetry: boolean;
  }
> = {
  generic: {
    icon: AlertCircle,
    title: "Something went wrong",
    message:
      "We ran into an unexpected issue. This might be a temporary problem.",
    showRetry: true,
  },
  network: {
    icon: WifiOff,
    title: "Connection issue",
    message:
      "We're having trouble connecting. Please check your internet connection and try again.",
    showRetry: true,
  },
  payment: {
    icon: CreditCard,
    title: "Payments temporarily unavailable",
    message:
      "We're having trouble processing payments right now. Your subscription is not affected.",
    showRetry: true,
  },
  media: {
    icon: ImageOff,
    title: "Media couldn't load",
    message:
      "We're having trouble loading this content. Please refresh to try again.",
    showRetry: true,
  },
  data: {
    icon: AlertCircle,
    title: "Couldn't load data",
    message:
      "We're having trouble loading the information you need. Please try again.",
    showRetry: true,
  },
};

interface ErrorFallbackProps {
  type: ErrorType;
  onReset?: () => void;
}

/**
 * ErrorFallback - Presentational component for error states
 *
 * Can be used standalone or within ErrorBoundary
 */
export function ErrorFallback({ type, onReset }: ErrorFallbackProps) {
  const config = ERROR_CONFIGS[type];
  const Icon = config.icon;

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-3 rounded-full bg-muted w-fit">
          <Icon className="size-6 text-muted-foreground" />
        </div>
        <CardTitle className="text-lg">{config.title}</CardTitle>
        <CardDescription>{config.message}</CardDescription>
      </CardHeader>
      {config.showRetry && onReset && (
        <CardContent className="pt-0">
          <Button
            onClick={onReset}
            variant="outline"
            className="w-full min-h-[44px]"
          >
            <RefreshCw className="size-4 mr-2" aria-hidden="true" />
            Try again
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Inline error message for smaller error states
 *
 * Use when a full card is too much (e.g., inline form errors)
 */
interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function InlineError({ message, onRetry, className }: InlineErrorProps) {
  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border ${className || ""}`}
    >
      <AlertCircle className="size-5 text-muted-foreground shrink-0" />
      <p className="text-sm text-muted-foreground flex-1">{message}</p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="ghost"
          size="sm"
          className="shrink-0"
        >
          <RefreshCw className="size-4" />
        </Button>
      )}
    </div>
  );
}

/**
 * Media placeholder for when images/videos fail to load
 *
 * Use as fallback when media assets are unavailable
 */
interface MediaPlaceholderProps {
  type: "image" | "video" | "audio";
  className?: string;
  onRetry?: () => void;
}

export function MediaPlaceholder({
  type,
  className,
  onRetry,
}: MediaPlaceholderProps) {
  const labels = {
    image: "Image unavailable",
    video: "Video unavailable",
    audio: "Audio unavailable",
  };

  return (
    <div
      className={`flex flex-col items-center justify-center bg-muted rounded-lg p-6 ${className || ""}`}
    >
      <ImageOff className="size-8 text-muted-foreground mb-2" aria-hidden="true" />
      <p className="text-sm text-muted-foreground mb-3">{labels[type]}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="secondary" size="sm">
          <RefreshCw className="size-3 mr-1" aria-hidden="true" />
          Retry
        </Button>
      )}
    </div>
  );
}
