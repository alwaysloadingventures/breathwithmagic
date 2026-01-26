# Subscriber Onboarding Architecture

## Overview

This document defines the subscriber onboarding flow for breathwithmagic, designed to personalize the discovery experience and match users with creators aligned to their wellness goals.

**Design Principles:**

- Calm, warm, human (not corporate or gamified)
- Low friction (can skip quiz, can complete later)
- Value-first (explain why personalization helps)
- Creator-centric recommendations (not content-centric)

---

## Flow Sequence

### Screen 1: Welcome

**Purpose:** Build trust, set tone, offer authentication options

**Elements:**

- Brand mark and tagline
- Warm, inviting hero image (abstract, not faces - respect creator diversity)
- Trust badge: "Join 10,000+ practitioners" (or "Trusted by wellness seekers")
- Primary CTA: "Get Started"
- Social login options: Google, Apple (via Clerk)
- Alternative: "Sign in with email"
- Skip option: "Browse as guest" (limited, no subscriptions)

**Copy Example:**

> "Welcome to breathwithmagic"
> "Find your practice. Connect with guides who speak to you."
> [Get Started]

### Screen 2: Quiz Introduction

**Purpose:** Explain personalization value, set expectations

**Elements:**

- Brief explanation of why we ask these questions
- Time estimate: "Takes about 1 minute"
- Privacy note: "Your answers help us recommend creators - you can update anytime"
- Primary CTA: "Start Quiz"
- Skip option: "Skip for now" (goes to browse page)

**Copy Example:**

> "A few questions to find your perfect guide"
> "We'll use your answers to recommend creators whose style and focus match your practice goals."
> "Takes about 1 minute. You can update your preferences anytime."
> [Start Quiz] [Skip for now]

### Screen 3-7: Quiz Questions (5 screens, one question each)

**Purpose:** Gather preference data for creator matching

**Design Notes:**

- Single-select radio buttons (large, touch-friendly)
- Progress indicator (subtle, not stressful)
- Back navigation available
- Calm transitions between questions
- Each option has icon and label

### Screen 8: Name Input

**Purpose:** Personalize experience, create profile preview

**Elements:**

- First name input (optional last name)
- Profile avatar preview (placeholder or Clerk social photo if available)
- Brief preview of how name appears in the app
- Primary CTA: "Continue"

**Copy Example:**

> "What should we call you?"
> "This is how you'll appear to creators when you subscribe"

### Screen 9: Social Proof

**Purpose:** Build confidence in the platform and community

**Elements:**

- Key stats (creators, subscribers, practices completed)
- Simple visualization (could be animated counter or minimal graph)
- Testimonial from a real subscriber (rotate through 2-3)
- Primary CTA: "See Your Recommendations"

**Copy Example:**

> "You're in good company"
> "500+ creators. 25,000+ practices shared. A community growing every day."
> [Quote from subscriber about finding their guide]

### Screen 10: Personalized Recommendations

**Purpose:** Deliver immediate value, drive first follow/subscription

**Elements:**

- Heading acknowledging their preferences: "Based on your goals, here are creators we think you'll love"
- 3-5 creator cards with:
  - Avatar, name, category badge
  - Brief tagline/bio snippet
  - "Match" indicator (e.g., "Great for beginners", "Specializes in sleep")
  - Follow button (free) and Subscribe CTA
- View more link to explore page
- Skip to browse option

**Copy Example:**

> "Creators picked for you"
> "Based on your interest in [stress relief] and [breathwork], here are guides who can help."

---

## Quiz Questions Specification

### Question 1: Primary Goal

**Field Name:** `primaryGoal`
**Type:** Single select (enum)
**Purpose:** Core matching criterion for creator specialization

| Option                    | Value               | Maps to Creator Categories           |
| ------------------------- | ------------------- | ------------------------------------ |
| Reduce stress & find calm | `stress_relief`     | StressRelief, Breathwork, Meditation |
| Sleep better              | `better_sleep`      | Sleep, Meditation, SoundHealing      |
| Manage anxiety            | `anxiety`           | Breathwork, Meditation, Somatic      |
| Deepen spiritual practice | `spiritual_growth`  | Meditation, Breathwork, Mindfulness  |
| Improve physical wellness | `physical_wellness` | Yoga, Movement, Somatic              |

**UI Copy:**

> "What brings you here today?"
> "Choose the goal that feels most important right now"

### Question 2: Experience Level

**Field Name:** `experienceLevel`
**Type:** Single select (enum)
**Purpose:** Filter content difficulty, inform creator messaging

| Option                             | Value        | Content Filtering                         |
| ---------------------------------- | ------------ | ----------------------------------------- |
| Brand new to wellness practices    | `beginner`   | Beginner-friendly creators, intro content |
| I've tried a few times             | `occasional` | Accessible content, foundational          |
| I practice regularly               | `regular`    | All content levels                        |
| I have a deep, consistent practice | `advanced`   | Advanced content, specialized techniques  |

**UI Copy:**

> "How would you describe your experience?"
> "There's no wrong answer - this helps us find the right starting point"

### Question 3: Preferred Practice Time

**Field Name:** `preferredTime`
**Type:** Single select (enum)
**Purpose:** Personalize content suggestions, notification timing (future)

| Option                       | Value       |
| ---------------------------- | ----------- |
| Morning (wake up & energize) | `morning`   |
| Afternoon (midday reset)     | `afternoon` |
| Evening (wind down & rest)   | `evening`   |
| It varies for me             | `varies`    |

**UI Copy:**

> "When do you usually practice?"
> "We'll suggest content that fits your rhythm"

### Question 4: Daily Time Commitment

**Field Name:** `timeCommitment`
**Type:** Single select (enum)
**Purpose:** Filter content by duration, set realistic expectations

| Option             | Value        | Duration Filter   |
| ------------------ | ------------ | ----------------- |
| 5 minutes or less  | `5min`       | <= 5 min content  |
| Around 10 minutes  | `10min`      | 5-15 min content  |
| Around 20 minutes  | `20min`      | 15-25 min content |
| 30 minutes or more | `30min_plus` | 20+ min content   |

**UI Copy:**

> "How much time can you dedicate daily?"
> "Even a few minutes can make a difference"

### Question 5: Interested Modalities

**Field Name:** `interestedModalities`
**Type:** Multi-select (array of enums)
**Purpose:** Primary filter for creator type matching

| Option             | Value           | Creator Category Match  |
| ------------------ | --------------- | ----------------------- |
| Breathwork         | `breathwork`    | Breathwork              |
| Meditation         | `meditation`    | Meditation, Mindfulness |
| Yoga               | `yoga`          | Yoga                    |
| Sound healing      | `sound_healing` | SoundHealing            |
| Movement & somatic | `movement`      | Movement, Somatic       |

**UI Copy:**

> "What types of practice interest you?"
> "Select all that apply - you can explore others anytime"

**Note:** This is the only multi-select question. UI should clearly indicate multiple selection is allowed.

---

## Data Model

### Prisma Schema Addition

```prisma
// Add to existing schema.prisma

enum OnboardingStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  SKIPPED
}

enum PrimaryGoal {
  STRESS_RELIEF
  BETTER_SLEEP
  ANXIETY
  SPIRITUAL_GROWTH
  PHYSICAL_WELLNESS
}

enum ExperienceLevel {
  BEGINNER
  OCCASIONAL
  REGULAR
  ADVANCED
}

enum PreferredTime {
  MORNING
  AFTERNOON
  EVENING
  VARIES
}

enum TimeCommitment {
  FIVE_MIN
  TEN_MIN
  TWENTY_MIN
  THIRTY_PLUS_MIN
}

enum WellnessModality {
  BREATHWORK
  MEDITATION
  YOGA
  SOUND_HEALING
  MOVEMENT
}

model UserOnboarding {
  id                    String              @id @default(cuid())
  userId                String              @unique
  user                  User                @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Flow tracking
  status                OnboardingStatus    @default(NOT_STARTED)
  currentStep           Int                 @default(0)
  startedAt             DateTime?
  completedAt           DateTime?
  skippedAt             DateTime?

  // Quiz responses
  primaryGoal           PrimaryGoal?
  experienceLevel       ExperienceLevel?
  preferredTime         PreferredTime?
  timeCommitment        TimeCommitment?
  interestedModalities  WellnessModality[]

  // Profile data collected during onboarding
  displayName           String?

  // Recommendation results (cached for quick access)
  recommendedCreatorIds String[]            // Array of creator IDs
  recommendationsGeneratedAt DateTime?

  // Analytics
  quizStartedAt         DateTime?
  quizCompletedAt       DateTime?
  questionTimings       Json?               // { q1: 4200, q2: 3100, ... } ms per question

  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  @@index([status])
  @@index([completedAt])
}

// Update User model to add relation
model User {
  // ... existing fields
  onboarding            UserOnboarding?
}
```

### TypeScript Types

```typescript
// lib/types/onboarding.ts

export type OnboardingStep =
  | "welcome"
  | "quiz-intro"
  | "q-goal"
  | "q-experience"
  | "q-time"
  | "q-commitment"
  | "q-modalities"
  | "name-input"
  | "social-proof"
  | "recommendations";

export const ONBOARDING_STEPS: OnboardingStep[] = [
  "welcome",
  "quiz-intro",
  "q-goal",
  "q-experience",
  "q-time",
  "q-commitment",
  "q-modalities",
  "name-input",
  "social-proof",
  "recommendations",
];

export interface QuizAnswers {
  primaryGoal?: PrimaryGoal;
  experienceLevel?: ExperienceLevel;
  preferredTime?: PreferredTime;
  timeCommitment?: TimeCommitment;
  interestedModalities?: WellnessModality[];
}

export interface OnboardingState {
  currentStep: OnboardingStep;
  stepIndex: number;
  answers: QuizAnswers;
  displayName?: string;
  recommendations?: CreatorRecommendation[];
}

export interface CreatorRecommendation {
  creatorId: string;
  score: number;
  matchReasons: string[];
  creator: {
    id: string;
    handle: string;
    displayName: string;
    avatarUrl: string;
    category: CreatorCategory;
    bio: string;
    subscriptionPrice: number;
    subscriberCount: number;
  };
}
```

---

## Recommendation Algorithm

### Overview

The recommendation engine scores creators based on how well they match the user's quiz responses. Each factor contributes to a weighted score.

### Scoring Weights

| Factor                 | Weight | Rationale                      |
| ---------------------- | ------ | ------------------------------ |
| Modality match         | 40%    | Direct content type preference |
| Primary goal match     | 30%    | Core need alignment            |
| Experience level match | 20%    | Appropriate difficulty         |
| Subscriber count boost | 10%    | Social proof / quality signal  |

### Matching Logic

```typescript
// lib/recommendations/scorer.ts

interface ScoringContext {
  answers: QuizAnswers;
  creator: CreatorProfile;
}

function calculateCreatorScore(context: ScoringContext): number {
  const { answers, creator } = context;
  let score = 0;
  const matchReasons: string[] = [];

  // 1. Modality Match (40%)
  const modalityScore = calculateModalityScore(
    answers.interestedModalities,
    creator.category,
  );
  score += modalityScore * 0.4;
  if (modalityScore > 0.7) {
    matchReasons.push(`Specializes in ${formatCategory(creator.category)}`);
  }

  // 2. Primary Goal Match (30%)
  const goalScore = calculateGoalScore(answers.primaryGoal, creator.category);
  score += goalScore * 0.3;
  if (goalScore > 0.7) {
    matchReasons.push(`Great for ${formatGoal(answers.primaryGoal)}`);
  }

  // 3. Experience Level Match (20%)
  const experienceScore = calculateExperienceScore(
    answers.experienceLevel,
    creator,
  );
  score += experienceScore * 0.2;
  if (answers.experienceLevel === "BEGINNER" && creator.hasBeginnerContent) {
    matchReasons.push("Beginner-friendly");
  }

  // 4. Popularity Boost (10%)
  const popularityScore = calculatePopularityScore(creator.subscriberCount);
  score += popularityScore * 0.1;
  if (creator.isVerified) {
    matchReasons.push("Verified creator");
  }

  return { score, matchReasons };
}

// Modality to Category Mapping
const MODALITY_CATEGORY_MAP: Record<WellnessModality, CreatorCategory[]> = {
  BREATHWORK: ["Breathwork"],
  MEDITATION: ["Meditation", "Mindfulness"],
  YOGA: ["Yoga"],
  SOUND_HEALING: ["SoundHealing"],
  MOVEMENT: ["Movement", "Somatic"],
};

function calculateModalityScore(
  modalities: WellnessModality[] | undefined,
  creatorCategory: CreatorCategory,
): number {
  if (!modalities || modalities.length === 0) return 0.5; // Neutral if not specified

  for (const modality of modalities) {
    const matchingCategories = MODALITY_CATEGORY_MAP[modality];
    if (matchingCategories.includes(creatorCategory)) {
      return 1.0;
    }
  }
  return 0.2; // Low but not zero - allow discovery
}

// Goal to Category Mapping
const GOAL_CATEGORY_MAP: Record<PrimaryGoal, CreatorCategory[]> = {
  STRESS_RELIEF: ["StressRelief", "Breathwork", "Meditation"],
  BETTER_SLEEP: ["Sleep", "Meditation", "SoundHealing"],
  ANXIETY: ["Breathwork", "Meditation", "Somatic"],
  SPIRITUAL_GROWTH: ["Meditation", "Breathwork", "Mindfulness"],
  PHYSICAL_WELLNESS: ["Yoga", "Movement", "Somatic"],
};

function calculateGoalScore(
  goal: PrimaryGoal | undefined,
  creatorCategory: CreatorCategory,
): number {
  if (!goal) return 0.5;

  const matchingCategories = GOAL_CATEGORY_MAP[goal];
  if (matchingCategories.includes(creatorCategory)) {
    // Primary match gets full score, secondary matches get partial
    const index = matchingCategories.indexOf(creatorCategory);
    return index === 0 ? 1.0 : 0.7;
  }
  return 0.3;
}

// Experience Level Scoring
function calculateExperienceScore(
  level: ExperienceLevel | undefined,
  creator: CreatorProfile,
): number {
  if (!level) return 0.5;

  // Future: Use creator's content analysis to determine if they have beginner content
  // For now, use a simplified approach based on creator metadata

  switch (level) {
    case "BEGINNER":
      // Prefer creators with beginner-friendly content
      return creator.hasBeginnerContent ? 1.0 : 0.5;
    case "OCCASIONAL":
      return 0.8; // Most creators work for occasional practitioners
    case "REGULAR":
    case "ADVANCED":
      // No penalty for any creator
      return 0.7;
    default:
      return 0.5;
  }
}

// Popularity Score (logarithmic to prevent runaway effects)
function calculatePopularityScore(subscriberCount: number): number {
  // Log scale: 0 subscribers = 0, 100 = 0.5, 1000 = 0.75, 10000 = 1.0
  if (subscriberCount <= 0) return 0.3; // Base score for new creators
  return Math.min(1.0, Math.log10(subscriberCount) / 4);
}
```

### Query Strategy

```typescript
// lib/recommendations/generator.ts

async function generateRecommendations(
  userId: string,
  answers: QuizAnswers,
  limit: number = 5,
): Promise<CreatorRecommendation[]> {
  // 1. Get candidate creators (filter by active status)
  const candidateCategories = getCandidateCategories(answers);

  const candidates = await prisma.creatorProfile.findMany({
    where: {
      status: "active",
      stripeOnboardingComplete: true,
      // Pre-filter by likely matching categories
      category:
        candidateCategories.length > 0
          ? { in: candidateCategories }
          : undefined,
    },
    include: {
      _count: {
        select: { subscriptions: { where: { status: "active" } } },
      },
    },
    take: 50, // Score top 50 candidates
  });

  // 2. Score each candidate
  const scored = candidates.map((creator) => ({
    ...calculateCreatorScore({ answers, creator }),
    creator,
  }));

  // 3. Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // 4. Return top N
  return scored.slice(0, limit).map((s) => ({
    creatorId: s.creator.id,
    score: s.score,
    matchReasons: s.matchReasons,
    creator: {
      id: s.creator.id,
      handle: s.creator.handle,
      displayName: s.creator.displayName,
      avatarUrl: s.creator.avatarUrl,
      category: s.creator.category,
      bio: s.creator.bio,
      subscriptionPrice: s.creator.subscriptionPrice,
      subscriberCount: s.creator._count.subscriptions,
    },
  }));
}

function getCandidateCategories(answers: QuizAnswers): CreatorCategory[] {
  const categories = new Set<CreatorCategory>();

  // Add from modalities
  if (answers.interestedModalities) {
    for (const modality of answers.interestedModalities) {
      MODALITY_CATEGORY_MAP[modality].forEach((c) => categories.add(c));
    }
  }

  // Add from goal
  if (answers.primaryGoal) {
    GOAL_CATEGORY_MAP[answers.primaryGoal].forEach((c) => categories.add(c));
  }

  return Array.from(categories);
}
```

### Caching Strategy

```typescript
// Cache recommendations in Redis for 1 hour
const RECOMMENDATIONS_CACHE_TTL = 60 * 60; // 1 hour

async function getRecommendations(
  userId: string,
): Promise<CreatorRecommendation[]> {
  const cacheKey = `recommendations:${userId}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Get from database or regenerate
  const onboarding = await prisma.userOnboarding.findUnique({
    where: { userId },
  });

  if (!onboarding || !onboarding.recommendedCreatorIds.length) {
    return [];
  }

  // Hydrate creator data
  const creators = await prisma.creatorProfile.findMany({
    where: { id: { in: onboarding.recommendedCreatorIds } },
  });

  // Cache and return
  await redis.setex(
    cacheKey,
    RECOMMENDATIONS_CACHE_TTL,
    JSON.stringify(creators),
  );
  return creators;
}
```

---

## API Routes

### Onboarding Endpoints

```
POST   /api/onboarding/start
       - Creates UserOnboarding record if not exists
       - Returns current state (for resume flow)
       - Body: {}
       - Response: { onboarding: UserOnboarding, currentStep: string }

PATCH  /api/onboarding/progress
       - Updates current step and answers
       - Body: { step: string, answers?: Partial<QuizAnswers>, displayName?: string }
       - Response: { onboarding: UserOnboarding }

POST   /api/onboarding/skip
       - Marks onboarding as skipped
       - Body: { fromStep?: string }
       - Response: { onboarding: UserOnboarding }

POST   /api/onboarding/complete
       - Triggers recommendation generation
       - Marks onboarding as completed
       - Body: { answers: QuizAnswers, displayName: string }
       - Response: { onboarding: UserOnboarding, recommendations: CreatorRecommendation[] }

GET    /api/onboarding/status
       - Returns current onboarding state
       - Response: { status: OnboardingStatus, currentStep: number, canResume: boolean }

GET    /api/onboarding/recommendations
       - Returns cached recommendations (regenerates if stale)
       - Query: ?refresh=true (force regeneration)
       - Response: { recommendations: CreatorRecommendation[] }

PATCH  /api/onboarding/preferences
       - Updates preferences after onboarding (from settings)
       - Body: Partial<QuizAnswers>
       - Response: { onboarding: UserOnboarding }
       - Side effect: Invalidates recommendation cache
```

### Endpoint Details

```typescript
// app/api/onboarding/start/route.ts

import { auth } from "@clerk/nextjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get or create onboarding record
  let onboarding = await prisma.userOnboarding.findUnique({
    where: { userId },
  });

  if (!onboarding) {
    onboarding = await prisma.userOnboarding.create({
      data: {
        userId,
        status: "IN_PROGRESS",
        startedAt: new Date(),
        currentStep: 0,
      },
    });
  }

  return Response.json({
    onboarding,
    currentStep: ONBOARDING_STEPS[onboarding.currentStep],
    canResume: onboarding.status === "IN_PROGRESS",
  });
}
```

```typescript
// app/api/onboarding/complete/route.ts

import { auth } from "@clerk/nextjs";
import { prisma } from "@/lib/prisma";
import { generateRecommendations } from "@/lib/recommendations/generator";
import { quizAnswersSchema } from "@/lib/validations/onboarding";

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const validated = quizAnswersSchema.safeParse(body);

  if (!validated.success) {
    return Response.json(
      {
        error: "Invalid quiz answers",
        details: validated.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { answers, displayName } = validated.data;

  // Generate recommendations
  const recommendations = await generateRecommendations(userId, answers);

  // Update onboarding record
  const onboarding = await prisma.userOnboarding.update({
    where: { userId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      quizCompletedAt: new Date(),
      primaryGoal: answers.primaryGoal,
      experienceLevel: answers.experienceLevel,
      preferredTime: answers.preferredTime,
      timeCommitment: answers.timeCommitment,
      interestedModalities: answers.interestedModalities,
      displayName,
      recommendedCreatorIds: recommendations.map((r) => r.creatorId),
      recommendationsGeneratedAt: new Date(),
    },
  });

  // Update user display name if provided
  if (displayName) {
    await prisma.user.update({
      where: { id: userId },
      data: { name: displayName },
    });
  }

  return Response.json({
    onboarding,
    recommendations,
  });
}
```

### Validation Schemas

```typescript
// lib/validations/onboarding.ts

import { z } from "zod";

export const primaryGoalSchema = z.enum([
  "STRESS_RELIEF",
  "BETTER_SLEEP",
  "ANXIETY",
  "SPIRITUAL_GROWTH",
  "PHYSICAL_WELLNESS",
]);

export const experienceLevelSchema = z.enum([
  "BEGINNER",
  "OCCASIONAL",
  "REGULAR",
  "ADVANCED",
]);

export const preferredTimeSchema = z.enum([
  "MORNING",
  "AFTERNOON",
  "EVENING",
  "VARIES",
]);

export const timeCommitmentSchema = z.enum([
  "FIVE_MIN",
  "TEN_MIN",
  "TWENTY_MIN",
  "THIRTY_PLUS_MIN",
]);

export const wellnessModalitySchema = z.enum([
  "BREATHWORK",
  "MEDITATION",
  "YOGA",
  "SOUND_HEALING",
  "MOVEMENT",
]);

export const quizAnswersSchema = z.object({
  primaryGoal: primaryGoalSchema.optional(),
  experienceLevel: experienceLevelSchema.optional(),
  preferredTime: preferredTimeSchema.optional(),
  timeCommitment: timeCommitmentSchema.optional(),
  interestedModalities: z.array(wellnessModalitySchema).optional(),
  displayName: z.string().min(1).max(50).optional(),
});

export const onboardingProgressSchema = z.object({
  step: z.string(),
  answers: quizAnswersSchema.partial().optional(),
  displayName: z.string().min(1).max(50).optional(),
});
```

---

## Integration with Existing Models

### User Model Updates

```prisma
model User {
  id                String            @id @default(cuid())
  clerkId           String            @unique
  email             String            @unique
  name              String?
  avatarUrl         String?
  stripeCustomerId  String?
  role              Role              @default(USER)
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  // Existing relations
  creatorProfile    CreatorProfile?
  subscriptions     Subscription[]
  follows           Follow[]
  messages          Message[]         @relation("SentMessages")
  receivedMessages  Message[]         @relation("ReceivedMessages")
  notifications     Notification[]
  contentViews      ContentView[]

  // NEW: Onboarding relation
  onboarding        UserOnboarding?

  @@index([clerkId])
  @@index([stripeCustomerId])
}
```

### Clerk Webhook Enhancement

Update the Clerk webhook to initialize onboarding:

```typescript
// app/api/webhooks/clerk/route.ts

// In user.created handler:
case 'user.created': {
  const user = await prisma.user.create({
    data: {
      clerkId: data.id,
      email: data.email_addresses[0].email_address,
      name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || null,
      avatarUrl: data.image_url,
    },
  });

  // Initialize onboarding record
  await prisma.userOnboarding.create({
    data: {
      userId: user.id,
      status: 'NOT_STARTED',
    },
  });

  break;
}
```

### Subscription Flow Integration

When a user subscribes to a creator recommended during onboarding:

```typescript
// Track conversion from onboarding recommendations
async function handleSubscriptionCreated(subscription: StripeSubscription) {
  const userOnboarding = await prisma.userOnboarding.findUnique({
    where: { userId: subscription.userId },
  });

  if (userOnboarding?.recommendedCreatorIds.includes(subscription.creatorId)) {
    // Log conversion for analytics
    await analytics.track("onboarding_recommendation_converted", {
      userId: subscription.userId,
      creatorId: subscription.creatorId,
      recommendationRank: userOnboarding.recommendedCreatorIds.indexOf(
        subscription.creatorId,
      ),
    });
  }
}
```

### Middleware for Onboarding Redirect

```typescript
// middleware.ts

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);
const isPublicRoute = createRouteMatcher([
  "/",
  "/explore",
  "/sign-in",
  "/sign-up",
  "/:handle",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = auth();

  // Skip for public routes or if not authenticated
  if (!userId || isPublicRoute(req) || isOnboardingRoute(req)) {
    return;
  }

  // Check onboarding status
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { onboarding: true },
  });

  // Redirect to onboarding if not completed and not skipped
  if (
    user?.onboarding?.status === "NOT_STARTED" ||
    user?.onboarding?.status === "IN_PROGRESS"
  ) {
    // Only redirect for main app routes (not API or assets)
    if (
      !req.nextUrl.pathname.startsWith("/api") &&
      !req.nextUrl.pathname.startsWith("/_next")
    ) {
      return Response.redirect(new URL("/onboarding", req.url));
    }
  }
});
```

---

## Page Routes

### New Pages Required

```
/onboarding                    -> Onboarding container (handles all steps)
/onboarding/welcome            -> Step 1: Welcome (can be entry point)
/onboarding/quiz               -> Steps 3-7: Quiz questions (dynamic)
/onboarding/profile            -> Step 8: Name input
/onboarding/recommendations    -> Step 10: Personalized recommendations
```

### Page Structure

```
app/
  onboarding/
    layout.tsx                 -> Onboarding layout (minimal nav, progress)
    page.tsx                   -> Main onboarding flow controller
    _components/
      OnboardingContainer.tsx  -> State machine for flow
      WelcomeStep.tsx          -> Welcome screen
      QuizIntroStep.tsx        -> Quiz introduction
      QuizQuestion.tsx         -> Reusable question component
      NameInputStep.tsx        -> Name input screen
      SocialProofStep.tsx      -> Stats and testimonials
      RecommendationsStep.tsx  -> Creator recommendations
      ProgressIndicator.tsx    -> Subtle progress bar
      SkipButton.tsx           -> Skip link component
```

### State Management

Use URL-based state for resumability:

```typescript
// app/onboarding/page.tsx

'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function OnboardingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialStep = searchParams.get('step') || 'welcome';

  const [currentStep, setCurrentStep] = useState<OnboardingStep>(initialStep);
  const [answers, setAnswers] = useState<QuizAnswers>({});

  // Persist state to URL for resumability
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('step', currentStep);
    router.replace(url.pathname + url.search);
  }, [currentStep]);

  // Load saved state on mount
  useEffect(() => {
    loadOnboardingState().then(state => {
      if (state) {
        setCurrentStep(state.currentStep);
        setAnswers(state.answers);
      }
    });
  }, []);

  const handleNext = async (stepData?: Partial<QuizAnswers>) => {
    const newAnswers = { ...answers, ...stepData };
    setAnswers(newAnswers);

    // Save progress to backend
    await saveProgress(currentStep, newAnswers);

    // Advance to next step
    const nextIndex = ONBOARDING_STEPS.indexOf(currentStep) + 1;
    if (nextIndex < ONBOARDING_STEPS.length) {
      setCurrentStep(ONBOARDING_STEPS[nextIndex]);
    }
  };

  const handleSkip = async () => {
    await skipOnboarding(currentStep);
    router.push('/explore');
  };

  return (
    <OnboardingContainer
      step={currentStep}
      answers={answers}
      onNext={handleNext}
      onBack={handleBack}
      onSkip={handleSkip}
    />
  );
}
```

---

## Analytics Events

Track these events for onboarding optimization:

| Event                          | Properties                  | Purpose                |
| ------------------------------ | --------------------------- | ---------------------- |
| `onboarding_started`           | source, referrer            | Track entry points     |
| `onboarding_step_viewed`       | step, stepIndex             | Funnel analysis        |
| `onboarding_step_completed`    | step, timeSpent             | Engagement             |
| `onboarding_question_answered` | question, answer, timeSpent | Question performance   |
| `onboarding_skipped`           | atStep, answersCompleted    | Drop-off analysis      |
| `onboarding_completed`         | totalTime, answersCount     | Success rate           |
| `recommendation_viewed`        | creatorId, rank, score      | Recommendation quality |
| `recommendation_followed`      | creatorId, rank             | Conversion             |
| `recommendation_subscribed`    | creatorId, rank, price      | Revenue attribution    |

---

## Edge Cases & Error Handling

### Resume Flow

- User closes browser mid-quiz: Resume from last saved step
- User clears cookies: Offer to restart or browse without personalization
- User returns after completing: Show recommendations again or skip to browse

### Empty Recommendations

- If no creators match criteria: Show top 5 most popular creators
- If no active creators exist: Show "Coming soon" message with email signup

### Partial Completion

- All quiz questions are optional
- Can skip individual questions
- Recommendations generated with available data (lower confidence)

### Rate Limiting

- Onboarding endpoints: 30 requests per minute per user
- Prevents automated abuse of recommendation engine

### Error States

```typescript
// Friendly error messages matching brand voice
const ONBOARDING_ERRORS = {
  SAVE_FAILED:
    "We couldn't save your progress. Your answers are safe - try again in a moment.",
  RECOMMENDATIONS_FAILED:
    "We're having trouble finding creators right now. You can explore on your own or try again.",
  SESSION_EXPIRED:
    "Your session has expired. Let's pick up where you left off.",
};
```

---

## Design Specifications

### Layout

- Full-screen, centered content
- Max-width: 480px for quiz questions
- Max-width: 720px for recommendations
- Generous padding: 32px mobile, 64px desktop

### Colors (from design system)

- Background: `hsl(30, 20%, 98%)` - warm off-white
- Text: `hsl(30, 10%, 15%)` - warm dark gray
- Primary button: `hsl(25, 30%, 45%)` - warm terracotta
- Secondary elements: `hsl(35, 25%, 90%)` - warm cream

### Typography

- Question text: 24px, font-weight 500
- Option labels: 18px, font-weight 400
- Help text: 14px, muted color

### Animation

- Step transitions: Fade + subtle slide (200ms)
- Option selection: Soft scale (150ms)
- Progress bar: Smooth width transition (300ms)

### Accessibility

- All interactive elements: 44px minimum touch target
- Focus states visible
- Keyboard navigation for quiz
- Screen reader announcements for step changes
- Reduced motion respect for animations

---

## Future Enhancements

### Post-MVP

1. **Dynamic question branching**: Different questions based on previous answers
2. **Preference learning**: Update recommendations based on follow/subscribe behavior
3. **Re-onboarding**: "Update preferences" flow in settings
4. **A/B testing**: Question order, copy variations, recommendation algorithms
5. **Creator onboarding quiz**: Similar flow for creators to self-describe

### Analytics-Driven Optimization

- Track question completion rates to identify friction
- Measure recommendation-to-subscription conversion by question answer
- Identify which match reasons drive highest conversion
