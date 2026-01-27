/**
 * Subscription Validation Schemas
 *
 * Zod schemas for validating subscription-related data
 */
import { z } from "zod";

/**
 * Subscription status enum matching Prisma
 */
export const subscriptionStatusSchema = z.enum([
  "active",
  "canceled",
  "past_due",
  "trialing",
]);

/**
 * Schema for creating a subscription (checkout session)
 */
export const createSubscriptionSchema = z.object({
  // Creator ID is from the route parameter, not body
});

/**
 * Schema for subscription webhook metadata
 */
export const subscriptionMetadataSchema = z.object({
  creatorId: z.string().min(1),
  userId: z.string().min(1),
  platform: z.literal("breathwithmagic").optional(),
});

/**
 * Schema for subscription list query params
 */
export const subscriptionListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: subscriptionStatusSchema.optional(),
});

/**
 * Schema for subscription cancellation
 */
export const cancelSubscriptionSchema = z.object({
  // No body required - subscription ID comes from route
});

/**
 * Schema for billing portal request
 */
export const billingPortalSchema = z.object({
  returnUrl: z.string().url().optional(),
});

/**
 * Type exports
 */
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;
export type SubscriptionMetadata = z.infer<typeof subscriptionMetadataSchema>;
export type SubscriptionListQuery = z.infer<typeof subscriptionListQuerySchema>;
export type BillingPortalRequest = z.infer<typeof billingPortalSchema>;
