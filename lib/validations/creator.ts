/**
 * Creator Onboarding Validation Schemas
 *
 * Zod schemas for validating creator onboarding data
 */
import { z } from "zod";

// Handle validation: 3-30 chars, lowercase, alphanumeric + underscores
export const handleSchema = z
  .string()
  .min(3, "Handle must be at least 3 characters")
  .max(30, "Handle must be no more than 30 characters")
  .regex(
    /^[a-z0-9_]+$/,
    "Handle can only contain lowercase letters, numbers, and underscores",
  )
  .refine(
    (val) => !val.startsWith("_"),
    "Handle cannot start with an underscore",
  )
  .refine((val) => !val.endsWith("_"), "Handle cannot end with an underscore")
  .refine(
    (val) => !val.includes("__"),
    "Handle cannot contain consecutive underscores",
  );

// Creator categories matching Prisma enum
export const creatorCategorySchema = z.enum([
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
]);

// Subscription price tiers matching Prisma enum
export const subscriptionPriceTierSchema = z.enum([
  "TIER_500",
  "TIER_1000",
  "TIER_2000",
  "TIER_3000",
]);

// Step 1: Handle Selection
export const handleSelectionSchema = z.object({
  handle: handleSchema,
});

// Step 2: Profile Setup
export const profileSetupSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name must be no more than 50 characters")
    .trim(),
  bio: z
    .string()
    .max(500, "Bio must be no more than 500 characters")
    .optional()
    .nullable(),
  // avatarUrl is handled separately via file upload
});

// Step 3: Category & Pricing
export const categoryPricingSchema = z.object({
  category: creatorCategorySchema,
  subscriptionPrice: subscriptionPriceTierSchema,
  trialEnabled: z.boolean().default(true),
});

// Full onboarding data
export const creatorOnboardingSchema = z.object({
  handle: handleSchema,
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name must be no more than 50 characters")
    .trim(),
  bio: z
    .string()
    .max(500, "Bio must be no more than 500 characters")
    .optional()
    .nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  category: creatorCategorySchema,
  subscriptionPrice: subscriptionPriceTierSchema,
  trialEnabled: z.boolean().default(true),
});

// Type exports for use in components
export type HandleSelection = z.infer<typeof handleSelectionSchema>;
export type ProfileSetup = z.infer<typeof profileSetupSchema>;
export type CategoryPricing = z.infer<typeof categoryPricingSchema>;
export type CreatorOnboarding = z.infer<typeof creatorOnboardingSchema>;
export type CreatorCategory = z.infer<typeof creatorCategorySchema>;
export type SubscriptionPriceTier = z.infer<typeof subscriptionPriceTierSchema>;

// Helper to get price display from tier
export const priceTierToAmount: Record<SubscriptionPriceTier, number> = {
  TIER_500: 5,
  TIER_1000: 10,
  TIER_2000: 20,
  TIER_3000: 30,
};

// Category display names and descriptions
export const categoryInfo: Record<
  CreatorCategory,
  { label: string; description: string }
> = {
  Breathwork: {
    label: "Breathwork",
    description: "Breathing techniques and practices",
  },
  Yoga: {
    label: "Yoga",
    description: "Physical postures and mindful movement",
  },
  Meditation: {
    label: "Meditation",
    description: "Guided meditations and mindfulness",
  },
  Mindfulness: {
    label: "Mindfulness",
    description: "Present-moment awareness practices",
  },
  Somatic: {
    label: "Somatic",
    description: "Body-based healing and awareness",
  },
  SoundHealing: {
    label: "Sound Healing",
    description: "Healing through sound and vibration",
  },
  Movement: {
    label: "Movement",
    description: "Conscious movement and dance",
  },
  Coaching: {
    label: "Coaching",
    description: "Wellness and life coaching",
  },
  Sleep: {
    label: "Sleep",
    description: "Sleep improvement and relaxation",
  },
  StressRelief: {
    label: "Stress Relief",
    description: "Stress management techniques",
  },
};
