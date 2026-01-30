/**
 * Analytics Validation Schemas
 *
 * Zod schemas for validating analytics API data
 */
import { z } from "zod";

// =============================================================================
// PERIOD SCHEMA
// =============================================================================

export const analyticsPeriodSchema = z.enum(["7d", "30d", "90d", "all"]);

// =============================================================================
// ANALYTICS QUERY SCHEMA
// =============================================================================

export const analyticsQuerySchema = z.object({
  period: analyticsPeriodSchema.default("30d"),
});

// =============================================================================
// SUBSCRIBER LIST QUERY SCHEMA
// =============================================================================

export const subscriberListQuerySchema = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  status: z.enum(["active", "trialing", "all"]).default("all"),
});

// =============================================================================
// CREATOR SETTINGS UPDATE SCHEMA
// =============================================================================

export const creatorSettingsUpdateSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name must be no more than 50 characters")
    .trim()
    .optional(),
  bio: z
    .string()
    .max(500, "Bio must be no more than 500 characters")
    .optional()
    .nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable(),
  category: z
    .enum([
      "Breathwork",
      "Yoga",
      "Meditation",
      "Mindfulness",
      "Somatic",
      "SoundHealing",
      "Movement",
      "Coaching",
      "Sleep",
      "StressRelief",
    ])
    .optional(),
  subscriptionPrice: z
    .enum([
      "TIER_FREE",
      "TIER_500",
      "TIER_1000",
      "TIER_1500",
      "TIER_2000",
      "TIER_2500",
      "TIER_3000",
      "TIER_4000",
      "TIER_5000",
      "TIER_7500",
      "TIER_9900",
    ])
    .optional(),
  trialEnabled: z.boolean().optional(),
  dmEnabled: z.boolean().optional(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type AnalyticsPeriod = z.infer<typeof analyticsPeriodSchema>;
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type SubscriberListQuery = z.infer<typeof subscriberListQuerySchema>;
export type CreatorSettingsUpdate = z.infer<typeof creatorSettingsUpdateSchema>;

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface AnalyticsResponse {
  totalViews: number;
  completionRate: number;
  totalRevenue: number;
  revenueGrowth: number;
  subscriberCount: number;
  subscriberGrowth: number;
  topContent: Array<{
    id: string;
    title: string;
    views: number;
    completions: number;
  }>;
  viewsByDay: Array<{
    date: string;
    views: number;
  }>;
}

export interface SubscriberItem {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
  status: "active" | "trialing" | "canceled" | "past_due";
  priceAtPurchase: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
}

export interface SubscriberListResponse {
  items: SubscriberItem[];
  nextCursor: string | null;
  total: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the start date for a given period
 */
export function getPeriodStartDate(period: AnalyticsPeriod): Date | null {
  const now = new Date();

  switch (period) {
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "all":
      return null;
  }
}

/**
 * Format price tier to display amount
 */
export function formatPriceTier(tier: string): string {
  const amounts: Record<string, string> = {
    TIER_FREE: "Free",
    TIER_500: "$5",
    TIER_1000: "$10",
    TIER_1500: "$15",
    TIER_2000: "$20",
    TIER_2500: "$25",
    TIER_3000: "$30",
    TIER_4000: "$40",
    TIER_5000: "$50",
    TIER_7500: "$75",
    TIER_9900: "$99",
  };
  return amounts[tier] || tier;
}

/**
 * Format cents to dollars
 */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
