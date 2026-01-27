import { Badge } from "@/components/ui/badge";

/**
 * Props for TrialBadge component
 */
export interface TrialBadgeProps {
  /** Trial end date */
  trialEndDate: Date;
  /** Custom className */
  className?: string;
}

/**
 * Calculate days remaining until trial ends
 */
function getDaysRemaining(trialEndDate: Date): number {
  const now = new Date();
  const diffMs = trialEndDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * TrialBadge - Shows trial status and days remaining
 *
 * Displays a badge indicating the user is on a free trial,
 * with the number of days remaining.
 */
export function TrialBadge({ trialEndDate, className }: TrialBadgeProps) {
  const daysRemaining = getDaysRemaining(trialEndDate);

  if (daysRemaining <= 0) {
    return null;
  }

  // Show urgency styling when 2 or fewer days remain
  const isUrgent = daysRemaining <= 2;

  return (
    <Badge
      variant={isUrgent ? "destructive" : "secondary"}
      className={className}
      aria-label={
        isUrgent
          ? `Trial ending soon: ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} left`
          : undefined
      }
    >
      {daysRemaining === 1
        ? "1 day left in trial"
        : `${daysRemaining} days left in trial`}
    </Badge>
  );
}
