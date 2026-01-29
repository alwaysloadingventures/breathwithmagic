"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home, Mail } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Global Error Page
 *
 * Catches unhandled errors at the application level.
 * Provides a friendly error message and recovery options.
 *
 * Features:
 * - Retry button to attempt recovery
 * - Navigation options to continue using the app
 * - Error digest for support reference
 * - Logs error to console (production would send to monitoring)
 *
 * Design: Calm, warm error state - not alarming
 * Copy: Helpful, doesn't blame user, suggests next steps
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log error to console for debugging
    // In production, this would send to monitoring service (e.g., Sentry)
    console.error("Application error:", {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-muted w-fit">
            <AlertCircle className="size-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Something went wrong</CardTitle>
          <CardDescription className="text-base leading-relaxed">
            We ran into an unexpected issue. This might be a temporary problem,
            and trying again often helps.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={reset} className="w-full min-h-[44px]">
            <RefreshCw className="size-4 mr-2" aria-hidden="true" />
            Try again
          </Button>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "w-full min-h-[44px] flex items-center justify-center",
            )}
          >
            <Home className="size-4 mr-2" aria-hidden="true" />
            Go to homepage
          </Link>
          <Link
            href="mailto:support@breathwithmagic.com"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "w-full min-h-[44px] flex items-center justify-center",
            )}
          >
            <Mail className="size-4 mr-2" aria-hidden="true" />
            Contact support
          </Link>
          {error.digest && (
            <p className="text-center text-xs text-muted-foreground pt-2">
              Reference: {error.digest}
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
