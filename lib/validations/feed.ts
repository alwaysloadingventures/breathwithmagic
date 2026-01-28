/**
 * Feed & Content Consumption Validation Schemas
 *
 * Zod schemas for validating feed and content consumption data
 */
import { z } from "zod";

// =============================================================================
// FEED SCHEMAS
// =============================================================================

/**
 * Schema for feed query params
 */
export const feedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/**
 * Schema for creator content feed query params
 */
export const creatorContentFeedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  creatorId: z.string().cuid(),
});

// =============================================================================
// CONTENT VIEW SCHEMAS
// =============================================================================

/**
 * Schema for recording content views
 */
export const recordContentViewSchema = z.object({
  watchDuration: z
    .number()
    .int()
    .min(0)
    .max(86400) // Max 24 hours
    .optional(),
  completed: z.boolean().optional(),
});

/**
 * Schema for updating watch progress
 */
export const updateWatchProgressSchema = z.object({
  watchDuration: z.number().int().min(0).max(86400), // Max 24 hours in seconds
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type FeedQuery = z.infer<typeof feedQuerySchema>;
export type CreatorContentFeedQuery = z.infer<
  typeof creatorContentFeedQuerySchema
>;
export type RecordContentView = z.infer<typeof recordContentViewSchema>;
export type UpdateWatchProgress = z.infer<typeof updateWatchProgressSchema>;
