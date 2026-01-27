/**
 * Stripe Onboarding Refresh Page
 *
 * Users are redirected here when the Stripe onboarding link expires
 * or if they need to re-enter the flow. This page:
 * 1. Checks current status
 * 2. Automatically generates a new onboarding link
 * 3. Redirects back to Stripe to continue
 *
 * This provides a seamless recovery for interrupted onboarding.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";

type RefreshState =
  | "checking"
  | "generating"
  | "redirecting"
  | "complete"
  | "error";

export default function StripeOnboardingRefreshPage() {
  const router = useRouter();
  const [state, setState] = useState<RefreshState>("checking");
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = useCallback(
    async function () {
      try {
        // First, check current status
        const statusResponse = await fetch(
          "/api/creator/stripe/onboarding-status",
        );
        const statusData = await statusResponse.json();

        if (!statusResponse.ok) {
          if (statusData.code === "NO_CREATOR_PROFILE") {
            router.push("/become-creator");
            return;
          }
          throw new Error(statusData.error || "Failed to check status");
        }

        // If already complete, no need to refresh
        if (statusData.isComplete) {
          setState("complete");
          return;
        }

        // Generate a new onboarding link
        setState("generating");

        const connectResponse = await fetch("/api/creator/stripe/connect", {
          method: "POST",
        });

        const connectData = await connectResponse.json();

        if (!connectResponse.ok) {
          throw new Error(connectData.error || "Failed to generate new link");
        }

        // Redirect to Stripe
        setState("redirecting");
        window.location.href = connectData.url;
      } catch (err) {
        console.error("Error during refresh:", err);
        setError(
          err instanceof Error ? err.message : "Failed to resume Stripe setup",
        );
        setState("error");
      }
    },
    [router],
  );

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          {/* Checking / Generating / Redirecting */}
          {(state === "checking" ||
            state === "generating" ||
            state === "redirecting") && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
                  {state === "checking" && (
                    <Loader2 className="size-10 animate-spin text-primary" />
                  )}
                  {state === "generating" && (
                    <RefreshCw className="size-10 animate-spin text-primary" />
                  )}
                  {state === "redirecting" && (
                    <Loader2 className="size-10 animate-spin text-primary" />
                  )}
                </div>
                <CardTitle className="mt-4">
                  {state === "checking" && "Checking your progress..."}
                  {state === "generating" && "Generating new link..."}
                  {state === "redirecting" && "Redirecting to Stripe..."}
                </CardTitle>
                <CardDescription className="leading-relaxed">
                  {state === "checking" && "We're checking where you left off."}
                  {state === "generating" &&
                    "Creating a fresh onboarding link for you."}
                  {state === "redirecting" &&
                    "Taking you back to Stripe to continue."}
                </CardDescription>
              </CardHeader>
            </>
          )}

          {/* Already complete */}
          {state === "complete" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle className="size-10 text-primary" />
                </div>
                <CardTitle className="mt-4 text-primary">
                  Already complete!
                </CardTitle>
                <CardDescription className="leading-relaxed">
                  Your payment setup is already finished. You&apos;re ready to
                  accept subscriptions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => router.push("/creator/dashboard")}
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
              </CardContent>
            </>
          )}

          {/* Error */}
          {state === "error" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10">
                  <AlertCircle className="size-10 text-destructive" />
                </div>
                <CardTitle className="mt-4">Unable to continue</CardTitle>
                <CardDescription className="leading-relaxed">
                  {error}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-center text-sm text-muted-foreground">
                  Don&apos;t worry, your progress is saved. You can try again or
                  start fresh from your dashboard.
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => {
                      setState("checking");
                      setError(null);
                      handleRefresh();
                    }}
                    className="w-full"
                  >
                    Try Again
                  </Button>
                  <Link
                    href="/creator/onboarding"
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "w-full",
                    )}
                  >
                    Start Fresh
                  </Link>
                  <Button
                    onClick={() => router.push("/creator/dashboard")}
                    variant="ghost"
                    className="w-full"
                  >
                    Back to Dashboard
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
