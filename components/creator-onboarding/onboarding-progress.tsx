"use client";

import { cn } from "@/lib/utils";

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  steps: { title: string }[];
}

/**
 * Onboarding Progress Indicator
 *
 * Displays a horizontal progress bar showing the current step in the onboarding flow.
 * Includes screen reader support for accessibility.
 */
export function OnboardingProgress({
  currentStep,
  totalSteps,
  steps,
}: OnboardingProgressProps) {
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div
      className="w-full"
      role="progressbar"
      aria-valuenow={currentStep + 1}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
    >
      {/* Screen reader text */}
      <span className="sr-only">
        Step {currentStep + 1} of {totalSteps}: {steps[currentStep]?.title}
      </span>

      {/* Progress bar track */}
      <div className="h-1 w-full rounded-full bg-border">
        {/* Progress bar indicator */}
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Step indicator text (visible) */}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Step {currentStep + 1} of {totalSteps}
        </p>
        <p className="text-sm font-medium">{steps[currentStep]?.title}</p>
      </div>
    </div>
  );
}

interface StepIndicatorProps {
  steps: { title: string; description?: string }[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  allowNavigation?: boolean;
}

/**
 * Step Indicator (alternative design with dots)
 *
 * Optional alternative that shows individual step dots.
 * Can be used if a more detailed progress view is preferred.
 */
export function StepIndicator({
  steps,
  currentStep,
  onStepClick,
  allowNavigation = false,
}: StepIndicatorProps) {
  return (
    <nav aria-label="Onboarding progress" className="w-full">
      <ol className="flex items-center justify-center gap-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = allowNavigation && index < currentStep;

          return (
            <li key={step.title} className="flex items-center">
              <button
                type="button"
                onClick={() => isClickable && onStepClick?.(index)}
                disabled={!isClickable}
                className={cn(
                  "flex h-3 w-3 items-center justify-center rounded-full transition-all",
                  isCompleted && "bg-primary",
                  isCurrent &&
                    "bg-primary ring-2 ring-primary/30 ring-offset-2 ring-offset-background",
                  !isCompleted && !isCurrent && "bg-border",
                  isClickable &&
                    "cursor-pointer hover:ring-2 hover:ring-primary/20",
                )}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`${step.title}${isCompleted ? " (completed)" : isCurrent ? " (current)" : ""}`}
              >
                <span className="sr-only">{step.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
