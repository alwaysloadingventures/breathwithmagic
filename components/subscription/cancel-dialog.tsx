"use client";

import { useState } from "react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

/**
 * Props for CancelSubscriptionDialog component
 */
export interface CancelSubscriptionDialogProps {
  /** Subscription ID */
  subscriptionId: string;
  /** Creator display name */
  creatorName: string;
  /** Current period end date */
  periodEnd: Date;
  /** Callback when cancellation is complete */
  onCancelComplete?: () => void;
}

/**
 * CancelSubscriptionDialog - Confirmation modal for canceling a subscription
 *
 * Shows important information about what happens when canceling:
 * - Access continues until period end
 * - No immediate refund
 * - Can resubscribe anytime
 */
export function CancelSubscriptionDialog({
  subscriptionId,
  creatorName,
  periodEnd,
  onCancelComplete,
}: CancelSubscriptionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formattedDate = format(periodEnd, "MMMM d, yyyy");

  async function handleCancel() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel subscription");
      }

      setIsOpen(false);
      onCancelComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button variant="outline" size="default" />}>
        Cancel subscription
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel subscription to {creatorName}?</DialogTitle>
          <DialogDescription>
            Your subscription will be canceled at the end of your current
            billing period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-6">
          <div className="rounded-lg bg-muted p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 mt-0.5 text-muted-foreground" aria-hidden>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">
                  Access until {formattedDate}
                </p>
                <p className="text-muted-foreground text-sm">
                  You can continue to enjoy all content until your current
                  period ends.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 mt-0.5 text-muted-foreground" aria-hidden>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">
                  Resubscribe anytime
                </p>
                <p className="text-muted-foreground text-sm">
                  You can always come back and subscribe again in the future.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div
              className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive"
              role="alert"
            >
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" disabled={isLoading} />}
          >
            Keep subscription
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {isLoading ? "Canceling..." : "Cancel subscription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
