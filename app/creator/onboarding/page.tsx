/**
 * Creator Stripe Onboarding Page
 *
 * Entry point for Stripe Connect Express account setup.
 * This page initiates the onboarding flow by creating/resuming
 * a Stripe account and redirecting to Stripe-hosted onboarding.
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
import { Loader2, CreditCard, AlertCircle, ArrowLeft } from "lucide-react";

type OnboardingState =
  | "loading"
  | "ready"
  | "redirecting"
  | "error"
  | "complete";

export default function CreatorStripeOnboardingPage() {
  const router = useRouter();
  const [state, setState] = useState<OnboardingState>("loading");
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(
    async function () {
      try {
        const response = await fetch("/api/creator/stripe/onboarding-status");
        const data = await response.json();

        if (!response.ok) {
          if (data.code === "NO_CREATOR_PROFILE") {
            // Redirect to creator onboarding
            router.push("/become-creator");
            return;
          }
          throw new Error(data.error || "Failed to check status");
        }

        if (data.isComplete) {
          setState("complete");
        } else {
          setState("ready");
        }
      } catch (err) {
        console.error("Error checking status:", err);
        setError(err instanceof Error ? err.message : "Failed to load status");
        setState("error");
      }
    },
    [router],
  );

  // Check current status on mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  async function startOnboarding() {
    setState("redirecting");
    setError(null);

    try {
      const response = await fetch("/api/creator/stripe/connect", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start onboarding");
      }

      // Redirect to Stripe-hosted onboarding
      window.location.href = data.url;
    } catch (err) {
      console.error("Error starting onboarding:", err);
      setError(
        err instanceof Error ? err.message : "Failed to start Stripe setup",
      );
      setState("error");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <Link
            href="/creator/dashboard"
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-3xl px-4 py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
              <CreditCard className="size-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Set Up Payments</CardTitle>
            <CardDescription className="leading-relaxed">
              Connect with Stripe to start accepting payments from subscribers
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Loading state */}
            {state === "loading" && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Checking your account status...
                </p>
              </div>
            )}

            {/* Ready to start */}
            {state === "ready" && (
              <div className="space-y-6">
                <div className="rounded-lg bg-muted/50 p-4">
                  <h3 className="font-medium">What you&apos;ll need:</h3>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <li>- Valid government ID</li>
                    <li>- Bank account for payouts</li>
                    <li>- A few minutes to complete the form</li>
                  </ul>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <h3 className="font-medium">How it works:</h3>
                  <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                    <li>
                      1. You&apos;ll be redirected to Stripe&apos;s secure
                      onboarding
                    </li>
                    <li>2. Enter your personal and banking information</li>
                    <li>
                      3. Once verified, you&apos;ll be ready to accept payments
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    onClick={startOnboarding}
                    size="lg"
                    className="w-full"
                  >
                    Continue to Stripe
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Your information is securely handled by Stripe.
                    <br />
                    breathwithmagic never stores your banking details.
                  </p>
                </div>
              </div>
            )}

            {/* Redirecting */}
            {state === "redirecting" && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Redirecting to Stripe...
                </p>
              </div>
            )}

            {/* Error state */}
            {state === "error" && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-4 text-destructive">
                  <AlertCircle className="size-5 shrink-0" />
                  <div>
                    <p className="font-medium">Something went wrong</p>
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setState("loading");
                    checkStatus();
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Already complete */}
            {state === "complete" && (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
                  <CreditCard className="size-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-primary">
                    Payment setup complete
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    You&apos;re all set to accept payments from subscribers.
                  </p>
                </div>
                <Link
                  href="/creator/dashboard"
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  Back to Dashboard
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
