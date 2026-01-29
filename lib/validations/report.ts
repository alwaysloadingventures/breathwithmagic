/**
 * Content Report Validation Schemas
 *
 * Zod schemas for validating content report data
 *
 * @see PRD Phase 6, Task 18: Content Moderation
 */
import { z } from "zod";

// =============================================================================
// ENUMS (matching Prisma schema)
// =============================================================================

export const reportReasonSchema = z.enum([
  "INAPPROPRIATE",
  "SPAM",
  "HARASSMENT",
  "COPYRIGHT",
  "MISLEADING",
  "OTHER",
]);

export const reportStatusSchema = z.enum([
  "PENDING",
  "REVIEWED",
  "ACTION_TAKEN",
  "DISMISSED",
]);

// =============================================================================
// REPORT SCHEMAS
// =============================================================================

/**
 * Schema for creating a new content report
 */
export const createReportSchema = z.object({
  reason: reportReasonSchema,
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or less")
    .optional()
    .nullable(),
});

/**
 * Schema for updating a report (admin action)
 */
export const updateReportSchema = z.object({
  status: reportStatusSchema,
  reviewNotes: z
    .string()
    .max(5000, "Review notes must be 5000 characters or less")
    .optional()
    .nullable(),
});

/**
 * Schema for listing reports with filters (admin)
 */
export const reportListQuerySchema = z.object({
  status: reportStatusSchema.optional(),
  reason: reportReasonSchema.optional(),
  contentId: z.string().cuid().optional(),
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Schema for moderation action on content
 */
export const moderationActionSchema = z.object({
  action: z.enum(["archive", "delete", "warn_creator"]),
  reason: z.string().max(1000, "Reason must be 1000 characters or less"),
  notifyCreator: z.boolean().default(true),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ReportReason = z.infer<typeof reportReasonSchema>;
export type ReportStatus = z.infer<typeof reportStatusSchema>;
export type CreateReport = z.infer<typeof createReportSchema>;
export type UpdateReport = z.infer<typeof updateReportSchema>;
export type ReportListQuery = z.infer<typeof reportListQuerySchema>;
export type ModerationAction = z.infer<typeof moderationActionSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get human-readable label for report reason
 */
export function getReportReasonLabel(reason: ReportReason): string {
  const labels: Record<ReportReason, string> = {
    INAPPROPRIATE: "Inappropriate content",
    SPAM: "Spam or misleading",
    HARASSMENT: "Harassment or bullying",
    COPYRIGHT: "Copyright violation",
    MISLEADING: "Misleading information",
    OTHER: "Other",
  };
  return labels[reason];
}

/**
 * Get description for report reason (for UI)
 */
export function getReportReasonDescription(reason: ReportReason): string {
  const descriptions: Record<ReportReason, string> = {
    INAPPROPRIATE:
      "Content that violates community guidelines or contains explicit material",
    SPAM: "Repetitive content, advertising, or content that doesn't belong",
    HARASSMENT: "Content that targets, threatens, or bullies an individual",
    COPYRIGHT: "Content that infringes on intellectual property rights",
    MISLEADING:
      "Content that contains false or misleading health/wellness claims",
    OTHER: "Other concerns not covered above",
  };
  return descriptions[reason];
}

/**
 * Get human-readable label for report status
 */
export function getReportStatusLabel(status: ReportStatus): string {
  const labels: Record<ReportStatus, string> = {
    PENDING: "Pending review",
    REVIEWED: "Reviewed",
    ACTION_TAKEN: "Action taken",
    DISMISSED: "Dismissed",
  };
  return labels[status];
}

/**
 * Get badge variant for report status
 */
export function getReportStatusVariant(
  status: ReportStatus
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "PENDING":
      return "secondary";
    case "REVIEWED":
      return "outline";
    case "ACTION_TAKEN":
      return "destructive";
    case "DISMISSED":
      return "default";
    default:
      return "secondary";
  }
}
