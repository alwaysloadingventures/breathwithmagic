/**
 * Stripe Onboarding Return Page
 *
 * Users are redirected here after completing (or attempting to complete)
 * Stripe Express onboarding. This page:
 * 1. Checks the actual onboarding status with Stripe
 * 2. Shows success or next steps based on status
 * 3. Redirects to dashboard when complete
 */
"use client";

import { useEffect, useState } from "react";
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
import {
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

type StatusState =
  | "checking"
  | "complete"
  | "pending_verification"
  | "incomplete"
  | "error";

interface StatusDetails {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  currentlyDue: string[];
  message: string;
}

export default function StripeOnboardingReturnPage() {
  const router = useRouter();
  const [status, setStatus] = useState<StatusState>("checking");
  const [details, setDetails] = useState<StatusDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  async function checkOnboardingStatus() {
    try {
      const response = await fetch("/api/creator/stripe/onboarding-status");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to check status");
      }

      setDetails({
        chargesEnabled: data.details?.chargesEnabled ?? false,
        payoutsEnabled: data.details?.payoutsEnabled ?? false,
        detailsSubmitted: data.details?.detailsSubmitted ?? false,
        currentlyDue: data.details?.currentlyDue ?? [],
        message: data.message,
      });

      if (data.isComplete) {
        setStatus("complete");
      } else if (data.status === "pending_verification") {
        setStatus("pending_verification");
      } else {
        setStatus("incomplete");
      }
    } catch (err) {
      console.error("Error checking status:", err);
      setError(err instanceof Error ? err.message : "Failed to check status");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main content */}
      <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          {/* Checking status */}
          {status === "checking" && (
            <>
              <CardHeader className="text-center">
                <Loader2 className="mx-auto size-12 animate-spin text-primary" />
                <CardTitle className="mt-4">Verifying your setup</CardTitle>
                <CardDescription className="leading-relaxed">
                  Just a moment while we confirm your Stripe account status...
                </CardDescription>
              </CardHeader>
            </>
          )}

          {/* Complete */}
          {status === "complete" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle className="size-10 text-primary" />
                </div>
                <CardTitle className="mt-4 text-primary">
                  You&apos;re all set!
                </CardTitle>
                <CardDescription className="leading-relaxed">
                  Your payment setup is complete. You can now accept
                  subscriptions from your followers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => router.push("/creator/dashboard")}
                  className="w-full"
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </CardContent>
            </>
          )}

          {/* Pending verification */}
          {status === "pending_verification" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted">
                  <Clock className="size-10 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4">Verification in progress</CardTitle>
                <CardDescription className="leading-relaxed">
                  Stripe is verifying your information. This usually takes a few
                  minutes but can take up to 24 hours.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                  <p>
                    You&apos;ll be able to accept payments once verification is
                    complete. We&apos;ll update your dashboard automatically.
                  </p>
                </div>
                <Button
                  onClick={() => router.push("/creator/dashboard")}
                  variant="outline"
                  className="w-full"
                >
                  Back to Dashboard
                </Button>
              </CardContent>
            </>
          )}

          {/* Incomplete */}
          {status === "incomplete" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted">
                  <AlertCircle className="size-10 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4">Almost there</CardTitle>
                <CardDescription className="leading-relaxed">
                  {details?.message ||
                    "Your setup isn't complete yet. Please finish providing your information to Stripe."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {details?.currentlyDue && details.currentlyDue.length > 0 && (
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm font-medium">Still needed:</p>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {details.currentlyDue.slice(0, 3).map((item) => (
                        <li key={item}>
                          - {item.replace(/_/g, " ").replace(/\./g, " > ")}
                        </li>
                      ))}
                      {details.currentlyDue.length > 3 && (
                        <li>
                          - And {details.currentlyDue.length - 3} more items
                        </li>
                      )}
                    </ul>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Link
                    href="/creator/onboarding"
                    className={cn(buttonVariants(), "w-full")}
                  >
                    Continue Setup
                  </Link>
                  <Button
                    onClick={() => router.push("/creator/dashboard")}
                    variant="ghost"
                    className="w-full"
                  >
                    I&apos;ll finish later
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {/* Error */}
          {status === "error" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10">
                  <AlertCircle className="size-10 text-destructive" />
                </div>
                <CardTitle className="mt-4">Something went wrong</CardTitle>
                <CardDescription className="leading-relaxed">
                  {error}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => {
                      setStatus("checking");
                      checkOnboardingStatus();
                    }}
                    className="w-full"
                  >
                    Try Again
                  </Button>
                  <Button
                    onClick={() => router.push("/creator/dashboard")}
                    variant="outline"
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
