"use client";

/**
 * Report Content Button Component
 *
 * A calm, non-aggressive way for users to report content that violates guidelines.
 * Uses a modal dialog with reason selection and optional description.
 *
 * @see PRD Phase 6, Task 18: Content Moderation
 */

import { useState } from "react";
import { Flag, AlertTriangle, CheckCircle } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  type ReportReason,
  getReportReasonLabel,
  getReportReasonDescription,
} from "@/lib/validations/report";

// =============================================================================
// TYPES
// =============================================================================

interface ReportButtonProps {
  contentId: string;
  contentTitle?: string;
  /** Additional class names for the trigger button */
  className?: string;
  /** Variant for the trigger button */
  variant?: "ghost" | "outline" | "secondary";
  /** Size of the trigger button */
  size?: "default" | "sm" | "icon" | "icon-sm";
  /** Whether to show the label text */
  showLabel?: boolean;
}

type ReportStep = "reason" | "description" | "submitting" | "success" | "error";

// =============================================================================
// CONSTANTS
// =============================================================================

const REPORT_REASONS: ReportReason[] = [
  "INAPPROPRIATE",
  "SPAM",
  "HARASSMENT",
  "COPYRIGHT",
  "MISLEADING",
  "OTHER",
];

// =============================================================================
// COMPONENT
// =============================================================================

export function ReportButton({
  contentId,
  contentTitle,
  className,
  variant = "ghost",
  size = "icon-sm",
  showLabel = false,
}: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ReportStep>("reason");
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(
    null
  );
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset after animation completes
      setTimeout(() => {
        setStep("reason");
        setSelectedReason(null);
        setDescription("");
        setError(null);
      }, 200);
    }
  };

  // Handle reason selection
  const handleReasonSelect = (reason: ReportReason) => {
    setSelectedReason(reason);
    setStep("description");
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedReason) return;

    setStep("submitting");
    setError(null);

    try {
      const response = await fetch(`/api/content/${contentId}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: selectedReason,
          description: description.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setError("Please sign in to report content.");
        } else if (response.status === 409) {
          setError("You have already reported this content.");
        } else if (response.status === 429) {
          setError(
            "You've submitted too many reports recently. Please try again later."
          );
        } else {
          setError(data.error || "Something went wrong. Please try again.");
        }
        setStep("error");
        return;
      }

      setStep("success");
    } catch {
      setError("Failed to submit report. Please check your connection.");
      setStep("error");
    }
  };

  // Go back to reason selection
  const handleBack = () => {
    setStep("reason");
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant={variant}
            size={size}
            className={cn(
              "text-muted-foreground hover:text-foreground",
              className
            )}
            aria-label="Report this content"
          />
        }
      >
        <Flag className="h-4 w-4" />
        {showLabel && <span className="ml-2">Report</span>}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        {/* Step 1: Select Reason */}
        {step === "reason" && (
          <>
            <DialogHeader>
              <DialogTitle>Report Content</DialogTitle>
              <DialogDescription>
                {contentTitle ? (
                  <>
                    Help us understand what&apos;s wrong with &quot;
                    {contentTitle}&quot;.
                  </>
                ) : (
                  <>
                    Help us understand what&apos;s wrong with this content.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => handleReasonSelect(reason)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-colors min-h-[44px]",
                    "hover:border-primary/50 hover:bg-accent/30",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  )}
                >
                  <div className="font-medium text-sm">
                    {getReportReasonLabel(reason)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {getReportReasonDescription(reason)}
                  </div>
                </button>
              ))}
            </div>

            <DialogFooter showCloseButton />
          </>
        )}

        {/* Step 2: Add Description */}
        {step === "description" && selectedReason && (
          <>
            <DialogHeader>
              <DialogTitle>Tell us more</DialogTitle>
              <DialogDescription>
                You selected: {getReportReasonLabel(selectedReason)}. Add any
                additional context that might help us review this report.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional: Add more details about why you're reporting this content..."
                className="min-h-[100px]"
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {description.length}/2000
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button onClick={handleSubmit}>Submit Report</Button>
            </DialogFooter>
          </>
        )}

        {/* Step 3: Submitting */}
        {step === "submitting" && (
          <>
            <DialogHeader>
              <DialogTitle>Submitting Report</DialogTitle>
            </DialogHeader>
            <div className="py-8 flex flex-col items-center justify-center">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground mt-4">
                Please wait...
              </p>
            </div>
          </>
        )}

        {/* Step 4: Success */}
        {step === "success" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Report Submitted
              </DialogTitle>
              <DialogDescription>
                Thank you for helping keep our community safe. Our team will
                review your report and take appropriate action if needed.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                We may not be able to respond to every report individually, but
                we review all reports carefully.
              </p>
            </div>

            <DialogFooter>
              <DialogClose render={<Button />}>Done</DialogClose>
            </DialogFooter>
          </>
        )}

        {/* Step 5: Error */}
        {step === "error" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                Unable to Submit
              </DialogTitle>
              <DialogDescription>{error}</DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button variant="outline" onClick={handleBack}>
                Try Again
              </Button>
              <DialogClose render={<Button />}>Close</DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
