/**
 * Follow Validation Schemas
 *
 * Zod schemas for validating follow-related data
 */
import { z } from "zod";

/**
 * Schema for following list query params
 */
export const followingListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

/**
 * Type exports
 */
export type FollowingListQuery = z.infer<typeof followingListQuerySchema>;
