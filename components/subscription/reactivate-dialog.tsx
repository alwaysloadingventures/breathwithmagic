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
 * Props for ReactivateSubscriptionDialog component
 */
export interface ReactivateSubscriptionDialogProps {
  /** Subscription ID */
  subscriptionId: string;
  /** Creator display name */
  creatorName: string;
  /** Current period end date */
  periodEnd: Date;
  /** Price at purchase (cents) for display */
  priceAtPurchase: number;
  /** Callback when reactivation is complete */
  onReactivateComplete?: () => void;
}

/**
 * ReactivateSubscriptionDialog - Confirmation modal for reactivating a canceled subscription
 *
 * Shows information about what happens when reactivating:
 * - Subscription will continue at the current period end
 * - User will be charged the same rate
 */
export function ReactivateSubscriptionDialog({
  subscriptionId,
  creatorName,
  periodEnd,
  priceAtPurchase,
  onReactivateComplete,
}: ReactivateSubscriptionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formattedDate = format(periodEnd, "MMMM d, yyyy");
  const priceDisplay = `$${(priceAtPurchase / 100).toFixed(0)}`;

  async function handleReactivate() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: "PATCH",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reactivate subscription");
      }

      setIsOpen(false);
      onReactivateComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button variant="default" size="default" />}>
        Reactivate subscription
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Reactivate subscription to {creatorName}?
          </DialogTitle>
          <DialogDescription>
            Your subscription will continue automatically.
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
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">
                  Subscription continues
                </p>
                <p className="text-muted-foreground text-sm">
                  Your access will continue uninterrupted past {formattedDate}.
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
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">
                  Same {priceDisplay}/month rate
                </p>
                <p className="text-muted-foreground text-sm">
                  Your next payment will be on {formattedDate}.
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
            Keep canceled
          </DialogClose>
          <Button
            variant="default"
            onClick={handleReactivate}
            disabled={isLoading}
          >
            {isLoading ? "Reactivating..." : "Reactivate subscription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
