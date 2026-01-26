# breathwithmagic — Implementation Plan

## Overview

This plan outlines the MVP implementation for breathwithmagic, a creator-first wellness subscription platform. The MVP focuses on creator profiles, subscriptions, and content delivery.

**Version**: 2.0 (Updated after architecture, security, UX, onboarding, and performance reviews)

---

## Tech Stack

| Layer          | Technology                        |
| -------------- | --------------------------------- |
| Framework      | Next.js 14+ (App Router)          |
| Authentication | Clerk                             |
| Database       | PostgreSQL on Neon + Prisma ORM   |
| Caching        | Upstash Redis                     |
| Payments       | Stripe Connect (Express accounts) |
| Media Storage  | Cloudflare R2 (audio, images)     |
| Video Delivery | Cloudflare Stream                 |
| UI Components  | shadcn/ui + Tailwind CSS          |
| Email          | Resend                            |
| Hosting        | Vercel                            |

---

## Database Schema (Core Entities)

### Users

- `id`, `clerkId`, `email`, `name`, `avatarUrl`
- `stripeCustomerId`: string (nullable, set on first subscription)
- `role`: 'user' | 'creator'
- `createdAt`, `updatedAt`

**Indexes**: `(clerkId)`, `(stripeCustomerId)`

### CreatorProfiles

- `id`, `userId` (FK)
- `handle`: string (unique, lowercase, 3-30 chars, alphanumeric + underscores)
- `displayName`, `bio`, `avatarUrl`, `coverImageUrl`
- `category`: enum (Breathwork, Yoga, Meditation, Mindfulness, Somatic, SoundHealing, Movement, Coaching, Sleep, StressRelief)
- `subscriptionPrice`: enum tier ($5, $10, $20, $30)
- `trialEnabled`: boolean (7-day trial)
- `dmEnabled`: boolean
- `stripeAccountId` (Stripe Connect)
- `stripeOnboardingComplete`: boolean
- `status`: 'pending_setup' | 'active' | 'suspended' | 'deactivated'
- `isVerified`, `isFeatured`
- `createdAt`, `updatedAt`

**Indexes**: `(handle)`, `(category, status)`, `(isFeatured)`, `(userId)`

### Programs (Series/Collections)

- `id`, `creatorId` (FK)
- `title`, `description`, `thumbnailUrl`
- `isFree`: boolean
- `sortOrder`: int
- `publishedAt`, `createdAt`, `updatedAt`

**Indexes**: `(creatorId, publishedAt)`

### Content

- `id`, `creatorId` (FK)
- `programId`: FK (nullable, for content in a program/series)
- `type`: 'video' | 'audio' | 'text'
- `title`, `description`
- `mediaUrl`, `thumbnailUrl`
- `duration`: int (seconds, for video/audio)
- `isFree`: boolean
- `status`: 'draft' | 'published' | 'archived' | 'deleted'
- `sortOrder`: int (within program, nullable)
- `publishedAt`, `createdAt`, `updatedAt`, `deletedAt`

**Indexes**: `(creatorId, status, publishedAt)`, `(programId, sortOrder)`, `(type, publishedAt)`

### Subscriptions

- `id`, `userId` (FK), `creatorId` (FK)
- `stripeSubscriptionId`
- `status`: 'active' | 'canceled' | 'past_due' | 'trialing'
- `priceAtPurchase`: int (cents, for grandfathered pricing)
- `currentPeriodStart`, `currentPeriodEnd`
- `cancelAtPeriodEnd`: boolean
- `createdAt`, `updatedAt`

**Indexes**: `(userId, status)`, `(creatorId, status)`, `(status, currentPeriodEnd)`

### Follows (free following)

- `id`, `userId` (FK), `creatorId` (FK)
- `createdAt`

**Indexes**: `(userId)`, `(creatorId)`

### Messages

- `id`, `senderId` (FK), `receiverId` (FK)
- `content`, `isRead`
- `isBroadcast`: boolean
- `createdAt`

**Indexes**: `(receiverId, isRead, createdAt)`, `(senderId, createdAt)`

### Notifications

- `id`, `userId` (FK)
- `type`: 'new_content' | 'new_message' | 'subscription_renewed' | 'trial_ending' | 'payment_failed'
- `title`, `body`, `link`
- `isRead`: boolean
- `createdAt`

**Indexes**: `(userId, isRead, createdAt)`

### ContentViews (for analytics)

- `id`, `contentId` (FK), `userId` (FK)
- `watchDuration`, `completedAt`
- `createdAt`

**Indexes**: `(contentId, createdAt)`, `(userId, createdAt)`

### ProcessedWebhookEvents (idempotency)

- `id`, `eventId` (unique, Stripe/Clerk event ID)
- `eventType`, `processedAt`

**Indexes**: `(eventId)`

---

## API Conventions

### Pagination

All list endpoints use cursor-based pagination:

```
?cursor=<lastId>&limit=20
Response: { items: [], nextCursor: string | null }
```

Default limit: 20, Max limit: 100

### Rate Limiting

| Endpoint Category | Limit | Window   |
| ----------------- | ----- | -------- |
| Auth endpoints    | 5     | 1 minute |
| API general       | 100   | 1 minute |
| Content upload    | 10    | 1 hour   |
| Message send      | 30    | 1 hour   |
| Search            | 30    | 1 minute |
| Webhooks          | 1000  | 1 minute |

### Error Responses

```json
{ "error": "Human-readable message", "code": "ERROR_CODE" }
```

---

## Feature Breakdown

### Phase 1: Foundation

1. **Project setup**
   - Configure Clerk authentication with webhook signature verification
   - Set up Neon database + Prisma with indexes
   - Configure Tailwind + shadcn/ui with warm neutral theme
   - Set up Upstash Redis for caching
   - Configure Next.js Image with Cloudflare R2 remote patterns
   - Set up environment variables
   - Add security headers in next.config.ts

2. **User authentication flows**
   - Sign up / Sign in with Clerk (social login: Google, Apple)
   - Default all users to 'user' role (no immediate role selection)
   - "Become a Creator" upgrade path from user dashboard
   - User profile management

3. **Database schema & migrations**
   - Create all Prisma models with indexes
   - Run initial migrations
   - Seed data for development

### Phase 2: Creator Experience

4. **Creator onboarding** (restructured for low friction)
   - Step 1: Handle selection (breathwithmagic.com/[handle])
   - Step 2: Name only (bio, photo optional, can add later)
   - Step 3: Upload first content (before Stripe!)
   - Step 4: Category + pricing selection
   - Step 5: Stripe Connect Express (with interruption recovery)
   - "Continue Stripe Setup" banner on dashboard if incomplete
   - Preview profile before going live

5. **Stripe Connect integration**
   - Express account onboarding flow
   - Webhook signature verification (REQUIRED)
   - Idempotency handling for all webhooks
   - Return URL handling for interrupted verification
   - Webhook events:
     - `account.updated` (onboarding status)
     - `account.application.deauthorized` (disconnection)
   - Payout configuration (weekly, after 7-day hold)
   - Platform fee: 15% (decision finalized)

6. **Content upload system**
   - Video upload to Cloudflare Stream (use Stream React component, NOT custom player)
   - Audio upload to R2 with signed URLs
   - Text post editor
   - Thumbnail generation/upload (max 2MB, auto-resize)
   - Free vs paid content toggle
   - Draft/publish workflow
   - Programs/series organization

7. **Creator dashboard**
   - Content management (list, edit, soft delete, archive)
   - "Complete Setup" banner if Stripe incomplete
   - Subscriber list with pagination
   - Analytics dashboard:
     ```
     GET /api/creator/analytics?period=7d|30d|90d|all
     Response: { totalViews, completionRate, totalRevenue,
                 revenueGrowth, subscriberCount, subscriberGrowth,
                 topContent: [], viewsByDay: [] }
     ```
   - Settings (profile, pricing, DM toggle)

### Phase 3: User Experience

8. **Browse & discovery**
   - Public homepage with featured creators (ISR, 5-min revalidation)
   - Browse/explore page with category filters (ISR, 10-min revalidation)
   - Search by creator name
   - Creator profile pages with preview:
     - Guests see: bio, 2-3 free posts, blurred thumbnails of paid content
     - Content count: "42 exclusive videos"
   - Social proof: "X creators have earned $Y"

9. **Subscription flow**
   - Subscribe button shows price: "Subscribe for $10/month"
   - Always show: "Cancel anytime from settings"
   - Trial messaging: "7 days free, then $10/month"
   - Stripe Checkout (can start before account creation)
   - Trial flow (7-day) with conversion emails:
     - Day 1: Welcome with content highlights
     - Day 5: "Your trial ends in 2 days"
     - Day 7: "Trial ended - subscribe to continue"
   - Subscription management (cancel, view billing)
   - Grandfathered pricing: existing subscribers keep original price on creator price change

10. **Free following**
    - Follow button on creator profiles
    - Following list in user dashboard
    - Clear distinction: "Following lets you see free content. Subscribing unlocks everything."

11. **Content consumption**
    - Unified home feed (from subscribed creators) with pagination
    - Creator profile feed (chronological)
    - Blurred previews with lock icon for paywalled content
    - Paywall overlay: "Subscribe to unlock - $10/month - Cancel anytime"
    - Video player using Cloudflare Stream React component:
      - Lazy loaded with next/dynamic
      - Progress saving (debounced, every 30 seconds)
      - Adaptive quality (handled by Stream)
      - Playback speed (0.5x–2x)
      - Picture-in-picture
      - Fullscreen
      - Captions support

12. **Paywall enforcement**
    - Signed URLs with expiration (15-60 minutes) + user binding
    - Watermarking via Cloudflare Stream signed tokens
    - Access validation middleware with Redis caching (5-min TTL)
    - Periodic revalidation during playback

### Phase 4: Messaging

13. **Broadcast messaging**
    - Creator can send message to all subscribers
    - Message appears in subscriber inbox

14. **Direct messaging (1:1)**
    - Subscriber can message creator (if DMs enabled)
    - Creator can reply
    - Conversation inbox UI
    - Content sanitization (HTML allowed tags: b, i, em, strong, a, p, br)

### Phase 5: Notifications

15. **In-app notifications**
    - Notification bell with unread count (Redis cached, 30-sec TTL)
    - Notification inbox/dropdown
    - Mark as read

16. **Email notifications**
    - New content from subscribed creators
    - New message received
    - Trial ending reminders (day 5, day 6)
    - Payment failed
    - Subscription confirmations
    - Email preferences settings
    - All emails follow brand voice guidelines (see UX Copy section)

### Phase 6: Polish & Launch Prep

17. **SEO optimization**
    - Meta tags for creator profiles
    - Open Graph images
    - Sitemap generation
    - robots.txt configuration

18. **Content moderation**
    - Report content button
    - Admin review queue
    - Content guidelines page
    - Terms of service & privacy policy pages

19. **Mobile optimization**
    - Responsive testing
    - Touch-friendly interactions (44px min touch targets)
    - Mobile navigation patterns
    - Camera integration for photo upload

20. **Error handling & edge cases**
    - Failed payment handling (Stripe dunning)
    - Subscription expiry access removal
    - Content not found states
    - Loading states with aspect-ratio placeholders
    - Graceful degradation for third-party service outages

---

## Refunds & Disputes

### Refund Policy

- Prorated refund available within 7 days of billing
- No refund after 7 days
- Platform absorbs refund (not deducted from creator)

### Webhook Handling

- `charge.refunded` - Update subscription status, notify user
- `charge.dispute.created` - Alert admin, pause creator payouts pending review
- `charge.dispute.closed` - Resume payouts if dispute won

### Admin Endpoint

```
POST /api/admin/refunds - Process refund
GET /api/creator/refunds - View refunds affecting creator
```

---

## Page Structure

```
/                           → Homepage (featured creators, CTA)
/explore                    → Browse creators (filters, search)
/[creatorHandle]            → Creator profile (public)
/[creatorHandle]/post/[id]  → Individual content page

/sign-in                    → Clerk sign in
/sign-up                    → Clerk sign up

/home                       → User home feed (subscribed content)
/subscriptions              → Manage subscriptions
/following                  → Following list
/messages                   → Message inbox
/notifications              → Notification inbox
/settings                   → User settings
/become-creator             → Creator upgrade flow

/creator/dashboard          → Creator dashboard
/creator/content            → Content management
/creator/content/new        → Upload new content
/creator/programs           → Program/series management
/creator/analytics          → Analytics
/creator/subscribers        → Subscriber list
/creator/messages           → Creator inbox
/creator/settings           → Creator settings
/creator/onboarding         → Stripe Connect onboarding
/creator/onboarding/resume  → Resume interrupted Stripe setup

/admin/moderation           → Content moderation queue

/terms                      → Terms of service
/privacy                    → Privacy policy
```

---

## API Routes Structure

```
/api/webhooks/clerk         → Clerk webhook (user sync) - SIGNATURE VERIFIED
/api/webhooks/stripe        → Stripe webhook (subscriptions, payments) - SIGNATURE VERIFIED

/api/search                 → Search creators and content
  ?q=<query>&type=creators|content|all&limit=20

/api/creators               → List creators (paginated)
/api/creators/[id]          → Get creator details
/api/creators/[id]/content  → Get creator content (paginated)
/api/creators/[id]/follow   → Follow/unfollow
/api/creators/[id]/subscribe → Create subscription checkout

/api/content                → CRUD content
  PATCH /api/content/[id]   → Update metadata
  DELETE /api/content/[id]  → Soft delete
/api/content/[id]/view      → Record view analytics (debounced)
/api/content/upload-url     → Get presigned upload URL

/api/programs               → CRUD programs/series

/api/subscriptions          → User's subscriptions (paginated)
/api/subscriptions/[id]     → Cancel subscription
/api/subscriptions/billing-portal → Create Stripe billing portal session

/api/messages               → Get/send messages (paginated)
/api/messages/broadcast     → Send broadcast (creator)

/api/notifications          → Get notifications (paginated)
/api/notifications/read     → Mark as read

/api/user/settings          → User settings
/api/user/export            → GDPR data export

/api/creator/settings       → Creator settings
/api/creator/analytics      → Creator analytics data
/api/creator/onboarding-status → Check onboarding completion

/api/admin/refunds          → Process refunds (admin only)

/api/health                 → Health check (all dependencies)
```

---

## Third-Party Integrations

### Clerk

- User management
- Social login (Google, Apple)
- Webhook to sync users to database
- **REQUIRED**: Webhook signature verification using `svix`
- Session token customization: include userId, role, stripeCustomerId

### Stripe Connect

- Platform account setup
- Express account onboarding for creators
- Subscription creation with 15% application fee
- **REQUIRED**: Webhook signature verification using `stripe.webhooks.constructEvent()`
- **REQUIRED**: Idempotency handling (store processed event IDs)
- Webhook events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `customer.subscription.trial_will_end`
  - `invoice.payment_failed`
  - `invoice.upcoming`
  - `charge.refunded`
  - `charge.dispute.created`
  - `charge.dispute.closed`
  - `account.updated`
  - `account.application.deauthorized`

### Cloudflare R2

- Store audio files
- Store images (avatars, thumbnails)
- Presigned URLs for uploads
- Signed URLs for playback (time-limited + user-bound)
- **Image processing**: Resize on upload (avatars: 200/400px, thumbnails: 640/1280px)

### Cloudflare Stream

- Video transcoding & adaptive streaming
- Use `@cloudflare/stream-react` component (NOT custom player)
- Watermarking via Stream's signed tokens with subscriber ID
- Signed URLs with short expiration

### Upstash Redis

- Subscription status caching (5-min TTL)
- Notification count caching (30-sec TTL)
- Rate limiting
- Webhook processing queue

### Email Provider (Resend)

- Transactional emails
- New content notifications
- Subscription confirmations
- Trial reminders

---

## Security Considerations

### Authentication & Authorization

1. **Authentication**: All protected routes require Clerk session
2. **Authorization**: Middleware pattern for subscription/role checks
3. **Role transitions**: Users upgrade to creator via explicit action, not signup
4. **Session binding**: Content URLs bound to user ID, not just time

### Webhook Security

5. **Clerk webhooks**: Signature verification with `svix` library
6. **Stripe webhooks**: Signature verification with `stripe.webhooks.constructEvent()`
7. **Idempotency**: Store processed event IDs, check before processing
8. **Async processing**: Queue webhooks, respond immediately

### Content Protection

9. **Signed URLs**: Time-limited (15-60 min) + user-bound
10. **Watermarking**: Subscriber ID via Cloudflare Stream tokens
11. **Access revalidation**: Check subscription on each URL generation

### API Security

12. **Rate limiting**: Per endpoint category (see API Conventions)
13. **Input validation**: Zod schemas for all API inputs
14. **Content sanitization**: DOMPurify for user-generated content
15. **CORS**: Only allow production domain

### Infrastructure

16. **CSRF**: Next.js built-in protections
17. **Security headers**: HSTS, X-Frame-Options, X-Content-Type-Options, etc.
18. **Encryption**: Neon encryption at rest, SSL connections
19. **Secrets**: Vercel encrypted environment variables

### Compliance

20. **GDPR**: Data export endpoint, account deletion cascade
21. **CCPA**: "Do Not Sell" link, privacy policy disclosures
22. **PCI**: Delegated to Stripe (never store card data)

---

## Performance Requirements

### Caching Strategy

| Resource            | Cache Location | TTL         |
| ------------------- | -------------- | ----------- |
| Subscription status | Redis          | 5 min       |
| Creator profile     | ISR + Redis    | 10 min      |
| Homepage            | ISR            | 5 min       |
| Explore page        | ISR            | 10 min      |
| Notification count  | Redis          | 30 sec      |
| Signed media URLs   | None           | Per-request |

### Image Optimization

- Configure `next.config.ts` with Cloudflare R2 remote patterns
- Use `next/image` for all images with explicit dimensions
- Formats: AVIF, WebP
- LCP images: `priority` prop
- Max upload: 2MB, auto-resize on upload

### Video Delivery

- Use Cloudflare Stream React component (lazy loaded)
- Debounce progress saves (30 seconds)
- Let Stream handle adaptive quality

### Bundle Budgets

| Page              | Target | Max   |
| ----------------- | ------ | ----- |
| Homepage          | <100KB | 150KB |
| Creator Profile   | <120KB | 180KB |
| Video Player Page | <150KB | 200KB |
| Creator Dashboard | <200KB | 300KB |

### Database

- All tables have proper indexes (see schema)
- Cursor-based pagination on all list endpoints
- No N+1 queries (use Prisma includes)
- Background processing for analytics writes

---

## UX Copy Guidelines

### Brand Voice

- **Do**: Calm, human, warm, transparent, specific
- **Don't**: Urgent, corporate, spiritual jargon, vague, manipulative

### Key Copy Patterns

- Subscribe CTA: "Subscribe for $10/month" (always show price)
- Cancel policy: "Cancel anytime from settings" (always visible)
- Trial: "7 days free, then $10/month unless you cancel"
- Errors: Explain what happened, suggest next step, don't blame user
- Empty states: Turn nothing into guidance with clear next action

### Paywall Overlay

```
Subscribe to unlock
$10/month · Cancel anytime
[Subscribe now]
```

---

## Design System (Warm Neutrals)

### Colors

```css
--background: hsl(30, 20%, 98%) /* warm off-white */
  --foreground: hsl(30, 10%, 15%) /* warm dark gray */
  --muted: hsl(30, 15%, 94%) /* soft warm gray */
  --muted-foreground: hsl(30, 10%, 45%) /* medium warm gray */
  --primary: hsl(25, 30%, 45%) /* warm brown/terracotta */
  --primary-foreground: hsl(30, 20%, 98%) --accent: hsl(35, 25%, 90%)
  /* warm cream */ --border: hsl(30, 15%, 88%) /* subtle warm border */;
```

### Typography

- Font: Inter (single font family)
- Weights: 400, 500, 600, 700 only
- Generous line height for calm reading

### Spacing

- Generous whitespace
- Breathing room between elements
- Mobile-first responsive breakpoints
- 44px minimum touch targets

---

## Implementation Order (Recommended)

1. Foundation (Project setup, auth, database, caching)
2. Creator profiles (public pages, handle selection)
3. Content upload (video/audio/text to Cloudflare)
4. Stripe Connect (creator onboarding with recovery flow)
5. Subscriptions (checkout, access control, grandfathering)
6. Content consumption (player, paywall)
7. Browse & discovery (explore page, search)
8. User dashboard (home feed, subscriptions)
9. Creator dashboard (analytics, content management)
10. Messaging (broadcast, then DMs)
11. Notifications (in-app, then email)
12. Polish (SEO, mobile, error handling)

---

## Decisions Made

| Decision              | Choice                      | Rationale                                       |
| --------------------- | --------------------------- | ----------------------------------------------- |
| Platform fee          | 15%                         | Industry standard (Patreon 8-12%, OnlyFans 20%) |
| Grandfathered pricing | Yes                         | Existing subscribers keep original price        |
| Refund policy         | 7-day prorated              | Balance user trust and creator stability        |
| Trial                 | Per-user-per-creator        | Users can trial multiple creators               |
| Role selection        | Deferred                    | Default to user, upgrade when ready             |
| Video player          | Cloudflare Stream component | Performance, bundle size, maintenance           |
| Caching               | Upstash Redis               | Serverless, Vercel-optimized                    |

---

## Subscriber Onboarding Flow

### Overview

A personalized onboarding experience that guides new subscribers from signup to first subscription. Based on competitor analysis (Life Reset app), this flow uses a quiz-based personalization pattern adapted to breathwithmagic's warm, calm brand voice.

**Decision: Option B (Streamlined Flow) — CHOSEN FOR MVP**

| Option                                     | Status                                                           |
| ------------------------------------------ | ---------------------------------------------------------------- |
| **Option B: Streamlined Flow (4-5 steps)** | ✅ **CHOSEN** - Faster to value, optional quiz post-subscription |
| Option A: Full Quiz Flow (10 steps)        | 📋 Deferred - Post-MVP enhancement based on conversion data      |

**Rationale:** Creator-subscription platforms convert better when users see value before commitment. Auth at subscription (not upfront) reduces friction. Quiz flow can be A/B tested post-launch.

---

### Option A: Full Quiz Flow (Deferred - Post-MVP)

#### Flow Sequence

| Step | Screen               | Purpose                                |
| ---- | -------------------- | -------------------------------------- |
| 1    | Welcome              | Brand intro, trust badge, auth options |
| 2    | Quiz Intro           | Explain personalization value          |
| 3    | Q1: Primary Goal     | Why they're here                       |
| 4    | Q2: Experience Level | Filter difficulty                      |
| 5    | Q3: Preferred Time   | Notification preferences               |
| 6    | Q4: Daily Commitment | Content duration filter                |
| 7    | Q5: Modalities       | Creator category matching              |
| 8    | Profile Setup        | Name input (optional)                  |
| 9    | Social Proof         | Stats and testimonial                  |
| 10   | Recommendations      | Personalized creator matches           |

#### Screen Specifications

**Screen 1: Welcome**

```
Headline: "Find the practice that feels right."
Subheadline: "Breathwork, meditation, and movement from real teachers.
             No classes to book. No schedules to follow."
Trust badge: "Trusted by creators building meaningful practice communities"
Auth options: [Continue with Google] [Continue with Apple]
Skip: "I'll look around first" → /explore
```

**Screen 2: Quiz Introduction**

```
Headline: "Let's find teachers you'll actually want to practice with."
Body: "We'll ask a few quick questions about what you're looking for.
       It takes about a minute, and helps us show you creators
       whose approach matches yours."
CTA: [Start]
Skip: "Show me creators" → /explore
Time estimate: "Takes 60 seconds"
```

**Screen 3-7: Quiz Questions**

| Q#  | Field                | Question                                               | Options                                                                                                                                                                                                             |
| --- | -------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | primaryGoal          | "What brings you here right now?"                      | I want to feel less stressed, I'm looking for better sleep, I want to build a consistent practice, I'm curious about breathwork, I need help managing anxiety, I just want to feel more grounded, Prefer not to say |
| 2   | experienceLevel      | "How familiar are you with these practices?"           | Brand new to this, I've tried a few things, I practice sometimes, I have a regular practice                                                                                                                         |
| 3   | preferredTime        | "When do you usually have time to practice?"           | Early morning, During the day, Evening, Right before bed, Whenever I can fit it in                                                                                                                                  |
| 4   | timeCommitment       | "How much time feels realistic on most days?"          | 5 minutes or less, 10-15 minutes, 20-30 minutes, 30+ minutes, It depends on the day                                                                                                                                 |
| 5   | interestedModalities | "What kinds of practices interest you?" (multi-select) | Breathwork, Meditation, Yoga, Sound healing, Somatic movement, Mindfulness coaching, Not sure yet                                                                                                                   |

**Screen 8: Profile Setup**

```
Headline: "What should we call you?"
Helper: "Just your first name, or whatever you'd like to go by."
Input placeholder: "Your name"
CTA: [Continue]
Skip: "Skip for now" (use Clerk profile name)
```

**Screen 9: Social Proof**

```
Headline: "People are practicing here every day."
Stat: "Members report feeling noticeably calmer after just one week of practice."
Testimonial: "I finally found a teacher whose voice doesn't make me want
             to roll my eyes. Just real guidance when I need it." — Sarah, 34
CTA: [Show me my recommendations]
```

**Screen 10: Recommendations**

```
Headline: "Here are some teachers we think you'll connect with."
Subtext: "Based on what you told us, these creators match your pace and approach."
Creator cards: 3-5 matched creators with:
  - Photo, name, tagline
  - "Why we matched you" explanation
  - [View profile] [Subscribe] buttons
CTA: [Keep exploring] → /explore
```

---

### Option B: Streamlined Flow ✅ IMPLEMENTING

#### Flow Sequence

| Step | Screen                  | Purpose                                            |
| ---- | ----------------------- | -------------------------------------------------- |
| 1    | Landing                 | Value prop, featured creators, browse CTA          |
| 2    | Browse/Explore          | Category filters, creator cards (no auth required) |
| 3    | Creator Profile         | Bio, free content, subscription CTA                |
| 4    | Subscribe               | Auth triggers here, Stripe checkout                |
| 5    | Welcome + First Content | Success, "Start your first practice"               |

**Key Differences:**

- Auth happens at subscription, not upfront
- Shows creators immediately (value before commitment)
- Quiz is optional, offered post-subscription
- 5 steps vs 10 steps

#### Post-Subscription Optional Quiz

After first subscription, show prompt: "Want better recommendations? Answer 2 quick questions."

- Only ask modalities and experience level
- Store for improved discovery
- Never block access to content

---

### Data Model

```prisma
model UserOnboarding {
  id                    String   @id @default(cuid())
  userId                String   @unique
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Quiz status
  status                OnboardingStatus @default(NOT_STARTED)
  currentStep           Int      @default(0)
  startedAt             DateTime?
  completedAt           DateTime?

  // Quiz responses (all nullable for skip scenarios)
  primaryGoal           String?   // stress_relief, better_sleep, anxiety, spiritual_growth, physical_wellness, prefer_not_to_say
  experienceLevel       String?   // beginner, occasional, regular, advanced
  preferredTime         String?   // morning, afternoon, evening, varies
  timeCommitment        String?   // 5min, 10min, 20min, 30plus
  interestedModalities  String[]  // breathwork, meditation, yoga, sound_healing, movement

  // Consent tracking (REQUIRED for GDPR)
  consentGiven          Boolean   @default(false)
  consentVersion        String?   // e.g., "privacy-v1.2"
  consentTimestamp      DateTime?

  // Recommendations cache
  recommendedCreatorIds String[]
  recommendationsGeneratedAt DateTime?

  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@index([userId])
  @@index([status])
}

enum OnboardingStatus {
  NOT_STARTED
  IN_PROGRESS
  SKIPPED
  COMPLETED
}
```

**Note:** `primaryGoal` with values like "anxiety" constitutes health data under GDPR Article 9. This requires explicit consent before collection.

---

### Recommendation Algorithm

**Weighted Scoring (100 points max):**

| Factor             | Weight | Logic                                          |
| ------------------ | ------ | ---------------------------------------------- |
| Modality match     | 40%    | User's selected modalities vs creator category |
| Primary goal match | 30%    | Map goals to creator specializations           |
| Experience level   | 20%    | Beginner-friendly badges for new users         |
| Popularity boost   | 10%    | Log(subscriberCount) for social proof          |

**Goal → Category Mapping:**

```typescript
const goalToCategories: Record<PrimaryGoal, Category[]> = {
  stress_relief: ["StressRelief", "Breathwork", "Meditation"],
  better_sleep: ["Sleep", "Meditation", "SoundHealing"],
  anxiety: ["StressRelief", "Breathwork", "Mindfulness"],
  spiritual_growth: ["Meditation", "Yoga", "Mindfulness"],
  physical_wellness: ["Yoga", "Movement", "Somatic"],
  prefer_not_to_say: [], // Use modalities only
};
```

---

### API Routes

```
POST   /api/onboarding/start           → Initialize or resume onboarding
PATCH  /api/onboarding/progress        → Save step progress and answers
POST   /api/onboarding/skip            → Mark as skipped, redirect to browse
POST   /api/onboarding/complete        → Generate recommendations, finalize
GET    /api/onboarding/status          → Check current state
GET    /api/onboarding/recommendations → Retrieve cached creator recommendations
DELETE /api/onboarding                 → Delete onboarding data (GDPR)
```

**Rate Limits:**
| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/onboarding/_ | 10 | 1 minute |
| GET /api/onboarding/_ | 30 | 1 minute |
| DELETE /api/onboarding | 3 | 1 hour |

---

### Page Routes

```
/onboarding                    → Flow controller (redirects to current step)
/onboarding/welcome            → Step 1: Welcome + auth
/onboarding/intro              → Step 2: Quiz introduction
/onboarding/quiz               → Steps 3-7: Dynamic quiz screens
/onboarding/profile            → Step 8: Name input
/onboarding/proof              → Step 9: Social proof
/onboarding/recommendations    → Step 10: Creator matches
```

---

### UI Specifications

**Design System Adaptation:**

- Use warm neutrals (NOT dark theme like competitor)
- Primary: terracotta `hsl(25, 30%, 45%)`
- Background: warm off-white `hsl(30, 20%, 98%)`
- Cards: subtle warm border `hsl(30, 15%, 88%)`

**Key Components:**
| Component | Purpose |
|-----------|---------|
| `<OnboardingLayout>` | Wrapper with progress bar, back button, skip |
| `<QuizOptionCard>` | Interactive selection card (single/multi-select) |
| `<ProfilePreview>` | Real-time name preview with avatar |
| `<StatCard>` | Social proof statistics |
| `<TestimonialCard>` | User testimonial with quote marks |
| `<CreatorRecommendationCard>` | Creator match with "why matched" |

**Progress Indicator:**

- Thin horizontal bar at top (not dots)
- Track: `bg-border`, Indicator: `bg-primary`
- Screen reader: "Question 2 of 5"

**Quiz Cards:**

- 44px minimum touch target
- Selected state: `border-primary bg-primary/5`
- Hover: `border-primary/50 bg-accent/30`
- Checkmark icon on selection

**Animations:**

- Screen transitions: Slide (20px) + fade, 250ms ease-out
- Selection: Border/background color transition, 150ms
- Respect `prefers-reduced-motion`

---

### Consent Requirements

**GDPR Compliance (Required):**

- `primaryGoal` is health data under Article 9
- Must obtain explicit consent before quiz
- Consent must be separate from ToS acceptance
- Must track consent version and timestamp
- Must provide withdrawal mechanism in Settings

**Consent UI:**

```
Before quiz starts, show:
────────────────────────────────
We'd like to personalize your experience based on your wellness goals.
This may include information about your health and wellbeing.

[ ] I consent to breathwithmagic collecting my wellness preferences
    to personalize content recommendations.

You can delete this information anytime in Settings.

[Skip personalization] [Continue with personalization]
────────────────────────────────
```

**CCPA Compliance:**

- Notice at collection before quiz
- Include in data access requests
- Honor deletion requests

---

### Privacy Policy Additions

Add to `/privacy`:

```markdown
## Personalization Data

When you use breathwithmagic, you may complete an onboarding questionnaire
to personalize your experience. This collects:

- Your primary wellness goal (e.g., stress relief, better sleep)
- Your experience level with wellness practices
- Your preferred practice duration
- The types of practices you're interested in

**Health-related information**: Some options (such as "anxiety" or "better sleep")
may relate to your health. We treat this with extra care and only use it to
improve your recommendations.

**Your choices**:

- Skip personalization entirely
- Update or delete your data anytime in Settings
- Select "Prefer not to say" for sensitive questions

**Data retention**: Kept while your account is active. Deleted within 30 days
of account deletion.
```

---

### Conversion Optimization Notes

**Future A/B Tests (Post-MVP):**

1. Add quiz flow (Option A) vs keep streamlined only
2. Optional post-subscription quiz: 2 questions vs 5 questions
3. Social proof placement: Landing page vs creator profiles
4. Welcome email timing: Immediate vs +1 hour delay

**Skip Path Design:**

- Every step has visible skip option
- Skip leads to /explore (valuable destination)
- Partial quiz data still used for recommendations
- "Complete profile" prompt after first subscription

**Post-Onboarding (First 24 Hours):**

1. Success screen with creator photo
2. "Start your first practice" CTA → popular content
3. Email sequence: Welcome (immediate), first practice reminder (+6h), engagement check (+24h)

---

## Future Considerations (Post-MVP)

- **Full quiz-based onboarding flow (Option A)** - Implement if conversion data supports personalization value
- Community features (comments, forums)
- Creator collaborations
- Wellness challenges
- Practice consistency tracking (UserPracticeLog, Streaks, Goals tables)
- One-off content purchases (outside subscription)
- Mobile app (React Native)
- Live sessions

---

## Changelog

### 2025-01-25 - Onboarding Decision Finalized

- **DECISION: Option B (Streamlined Flow) chosen for MVP**
- Option A (Full Quiz Flow) deferred to post-MVP enhancement
- Rationale: Lower friction, faster to value, auth at subscription point

### 2025-01-25 - Subscriber Onboarding Flow Addition

- Added comprehensive subscriber onboarding specification
- Two options documented: Full quiz flow (10 steps) vs Streamlined flow (4-5 steps)
- New data model: UserOnboarding with quiz responses and consent tracking
- GDPR/CCPA compliance requirements for health-related data
- UI specifications adapted from competitor (warm palette, not dark theme)
- Copy written in calm, warm brand voice
- Reviewed by: prd-architect, security-auditor, ux-writer, ui-agent, onboarding-reviewer

---

## Next Steps

Upon approval of this plan:

1. Set up external accounts (Clerk, Stripe, Cloudflare, Neon, Vercel, Upstash)
2. Configure environment variables
3. Begin Phase 1 implementation

Ready to proceed when you approve this plan.
