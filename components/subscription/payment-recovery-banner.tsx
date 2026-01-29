"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, CreditCard, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * PaymentRecoveryBanner - Banner for users with past_due subscriptions
 *
 * Displays a prominent but calm banner prompting users to update their
 * payment method when a subscription payment has failed.
 *
 * Features:
 * - Dismissible (hides for current session)
 * - Links to billing portal
 * - Calm, non-alarming design
 * - Clear messaging per brand voice
 *
 * Usage:
 * ```tsx
 * {hasPastDueSubscription && <PaymentRecoveryBanner />}
 * ```
 */
export interface PaymentRecoveryBannerProps {
  /** Name of the creator (optional, for personalized message) */
  creatorName?: string;
  /** Optional callback when dismissed */
  onDismiss?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function PaymentRecoveryBanner({
  creatorName,
  onDismiss,
  className,
}: PaymentRecoveryBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const message = creatorName
    ? `We couldn't process your payment for ${creatorName}. Update your card to keep access.`
    : "We couldn't process a recent payment. Update your card to keep access to your subscriptions.";

  return (
    <Alert
      className={cn(
        "relative border-border bg-muted/50",
        className,
      )}
    >
      <AlertCircle className="size-4 text-primary" />
      <AlertTitle>Payment needs attention</AlertTitle>
      <AlertDescription>
        <p className="mb-3">{message}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            href="/subscriptions"
            className={buttonVariants({ size: "sm" })}
          >
            <CreditCard className="size-4 mr-2" aria-hidden="true" />
            Update payment method
          </Link>
        </div>
      </AlertDescription>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 size-8"
        onClick={handleDismiss}
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </Button>
    </Alert>
  );
}

/**
 * CompactPaymentBanner - Smaller inline banner for tighter spaces
 *
 * Use in sidebars or compact layouts
 */
export interface CompactPaymentBannerProps {
  className?: string;
}

export function CompactPaymentBanner({ className }: CompactPaymentBannerProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border",
        className,
      )}
    >
      <AlertCircle className="size-5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Payment failed</p>
        <Link
          href="/subscriptions"
          className="text-sm text-primary hover:text-primary/80 underline"
        >
          Update your card
        </Link>
      </div>
    </div>
  );
}

/**
 * SubscriptionExpiryWarning - Warning for subscriptions expiring soon
 *
 * Use when a subscription is set to cancel at period end
 */
export interface SubscriptionExpiryWarningProps {
  creatorName: string;
  expiryDate: Date;
  onReactivate?: () => void;
  className?: string;
}

export function SubscriptionExpiryWarning({
  creatorName,
  expiryDate,
  onReactivate,
  className,
}: SubscriptionExpiryWarningProps) {
  // Calculate days until expiry - use a memoized approach
  const now = new Date();
  const daysUntilExpiry = Math.ceil(
    (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  const formattedDate = expiryDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Alert
      className={cn(
        "border-muted-foreground/20 bg-muted/50",
        className,
      )}
    >
      <AlertCircle className="size-4" />
      <AlertTitle>Subscription ending soon</AlertTitle>
      <AlertDescription>
        <p className="mb-3">
          Your subscription to {creatorName} will end on {formattedDate}
          {daysUntilExpiry <= 7 && ` (${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"} left)`}.
          You&apos;ll lose access to their exclusive content after this date.
        </p>
        {onReactivate && (
          <Button onClick={onReactivate} size="sm" variant="outline">
            Keep my subscription
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * TrialEndingBanner - Banner for users whose trial is ending soon
 */
export interface TrialEndingBannerProps {
  creatorName: string;
  daysRemaining: number;
  creatorHandle: string;
  className?: string;
}

export function TrialEndingBanner({
  creatorName,
  daysRemaining,
  creatorHandle,
  className,
}: TrialEndingBannerProps) {
  return (
    <Alert
      className={cn(
        "border-primary/20 bg-primary/5",
        className,
      )}
    >
      <AlertCircle className="size-4 text-primary" />
      <AlertTitle className="text-primary">
        Trial ending in {daysRemaining} day{daysRemaining === 1 ? "" : "s"}
      </AlertTitle>
      <AlertDescription>
        <p className="mb-3">
          Your free trial with {creatorName} will end soon. Subscribe to keep
          enjoying their content.
        </p>
        <Link
          href={`/${creatorHandle}`}
          className={buttonVariants({ size: "sm" })}
        >
          View subscription options
        </Link>
      </AlertDescription>
    </Alert>
  );
}
