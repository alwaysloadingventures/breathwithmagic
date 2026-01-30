/**
 * Stripe Client Singleton
 *
 * Initializes and exports a configured Stripe client instance.
 * Uses environment variables for configuration.
 *
 * @see https://stripe.com/docs/api
 */
import Stripe from "stripe";

/**
 * Platform fee percentage for subscriptions
 * 15% as per business decision documented in PRD
 */
export const PLATFORM_FEE_PERCENT = 15;

/**
 * Stripe API version to use
 * Using latest stable version for all requests
 */
const STRIPE_API_VERSION = "2025-12-15.clover" as const;

/**
 * Check for required environment variables
 */
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

/**
 * Stripe client singleton instance
 * Configured for serverless environment (no automatic retries to avoid timeouts)
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: STRIPE_API_VERSION,
  typescript: true,
  // Optimize for serverless: limit retries to avoid timeout issues
  maxNetworkRetries: 2,
  timeout: 30000, // 30 second timeout
});

/**
 * Get the base URL for redirect URLs
 * Uses NEXT_PUBLIC_APP_URL or falls back to localhost in development
 */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Fallback for development
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  throw new Error(
    "NEXT_PUBLIC_APP_URL environment variable is required in production",
  );
}

/**
 * Create Stripe Express account for a creator
 *
 * @param email - Creator's email address
 * @param metadata - Optional metadata to attach to the account
 * @returns Created Stripe account
 */
export async function createExpressAccount(
  email: string,
  metadata?: Record<string, string>,
): Promise<Stripe.Account> {
  const account = await stripe.accounts.create({
    type: "express",
    country: "US",
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: "individual",
    settings: {
      payouts: {
        schedule: {
          delay_days: 7,
          interval: "weekly",
          weekly_anchor: "monday",
        },
      },
    },
    metadata,
  });

  return account;
}

/**
 * Create an account onboarding link for Stripe Express
 *
 * @param accountId - The Stripe account ID to create link for
 * @returns Account link with redirect URLs
 */
export async function createAccountOnboardingLink(
  accountId: string,
): Promise<Stripe.AccountLink> {
  const baseUrl = getBaseUrl();

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${baseUrl}/creator/onboarding/refresh`,
    return_url: `${baseUrl}/creator/onboarding/return`,
    type: "account_onboarding",
  });

  return accountLink;
}

/**
 * Create a login link for Stripe Express dashboard
 *
 * @param accountId - The Stripe account ID
 * @returns Login link URL
 */
export async function createExpressDashboardLink(
  accountId: string,
): Promise<Stripe.LoginLink> {
  const loginLink = await stripe.accounts.createLoginLink(accountId);
  return loginLink;
}

/**
 * Retrieve Stripe account details
 *
 * @param accountId - The Stripe account ID
 * @returns Account details
 */
export async function retrieveAccount(
  accountId: string,
): Promise<Stripe.Account> {
  return stripe.accounts.retrieve(accountId);
}

/**
 * Check if a Stripe account has completed onboarding
 * An account is considered complete when:
 * - charges_enabled is true (can accept payments)
 * - payouts_enabled is true (can receive payouts)
 * - details_submitted is true (completed onboarding form)
 *
 * @param account - Stripe account object
 * @returns true if onboarding is complete
 */
export function isOnboardingComplete(account: Stripe.Account): boolean {
  return (
    account.charges_enabled === true &&
    account.payouts_enabled === true &&
    account.details_submitted === true
  );
}

/**
 * Subscription price tiers in cents
 * Matches Prisma SubscriptionPriceTier enum
 */
export const PRICE_TIER_TO_CENTS: Record<string, number> = {
  TIER_FREE: 0, // $0/month (free tier)
  TIER_500: 500, // $5/month
  TIER_1000: 1000, // $10/month
  TIER_1500: 1500, // $15/month
  TIER_2000: 2000, // $20/month
  TIER_2500: 2500, // $25/month
  TIER_3000: 3000, // $30/month
  TIER_4000: 4000, // $40/month
  TIER_5000: 5000, // $50/month
  TIER_7500: 7500, // $75/month
  TIER_9900: 9900, // $99/month
};

/**
 * Cache for Stripe Price IDs to avoid repeated lookups
 * Key: `${tier}_platform` for platform prices (destination charges)
 */
const priceIdCache = new Map<string, string>();

/**
 * Get or create a Stripe Price for a subscription tier on the PLATFORM account
 *
 * IMPORTANT: For destination charges, prices must be created on the platform account,
 * NOT on connected accounts. The transfer_data.destination in the subscription
 * routes the funds (minus application_fee_percent) to the creator's connected account.
 *
 * @param tier - Subscription price tier (TIER_500, TIER_1000, etc.)
 * @returns Stripe Price ID on the platform account
 */
export async function getOrCreatePrice(tier: string): Promise<string> {
  const cacheKey = `${tier}_platform`;

  // Check cache first
  if (priceIdCache.has(cacheKey)) {
    return priceIdCache.get(cacheKey)!;
  }

  const amountInCents = PRICE_TIER_TO_CENTS[tier];
  if (!amountInCents) {
    throw new Error(`Invalid price tier: ${tier}`);
  }

  // Search for existing price on the platform account
  const existingPrices = await stripe.prices.list({
    active: true,
    type: "recurring",
    limit: 100,
    expand: ["data.product"],
  });

  // Look for a matching price
  const matchingPrice = existingPrices.data.find(
    (price) =>
      price.unit_amount === amountInCents &&
      price.currency === "usd" &&
      price.recurring?.interval === "month" &&
      price.metadata?.breathwithmagic === "true" &&
      price.metadata?.tier === tier,
  );

  if (matchingPrice) {
    priceIdCache.set(cacheKey, matchingPrice.id);
    return matchingPrice.id;
  }

  // Create product first on the platform account
  const product = await stripe.products.create({
    name: `breathwithmagic Subscription - ${tier.replace("TIER_", "$").replace("00", "")}`,
    description: `Monthly subscription to creator content`,
    metadata: {
      breathwithmagic: "true",
      tier,
    },
  });

  // Create price on the platform account
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: amountInCents,
    currency: "usd",
    recurring: {
      interval: "month",
    },
    metadata: {
      breathwithmagic: "true",
      tier,
    },
  });

  priceIdCache.set(cacheKey, price.id);
  return price.id;
}

/**
 * Get or create a Stripe Customer for a user
 *
 * @param email - User's email address
 * @param userId - Internal user ID (stored in metadata)
 * @param existingCustomerId - Existing customer ID if known
 * @returns Stripe Customer ID
 */
export async function getOrCreateCustomer(
  email: string,
  userId: string,
  existingCustomerId?: string | null,
): Promise<string> {
  // If we have an existing customer ID, verify it exists
  if (existingCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(existingCustomerId);
      if (!customer.deleted) {
        return existingCustomerId;
      }
    } catch {
      // Customer doesn't exist, create a new one
    }
  }

  // Search for existing customer by email
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0].id;
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      userId,
      platform: "breathwithmagic",
    },
  });

  return customer.id;
}

/**
 * Create a Checkout session for a subscription
 *
 * Uses destination charges so the creator receives the payment
 * minus the platform fee (application_fee_percent).
 *
 * IMPORTANT: For destination charges, prices must be created on the PLATFORM account,
 * not the connected account. The transfer_data.destination routes funds to the creator.
 *
 * @param options - Checkout session options
 * @returns Stripe Checkout Session
 */
export async function createSubscriptionCheckout(options: {
  customerId: string;
  priceId: string;
  creatorStripeAccountId: string;
  creatorId: string;
  userId: string;
  trialPeriodDays?: number;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  const session = await stripe.checkout.sessions.create({
    customer: options.customerId,
    mode: "subscription",
    line_items: [
      {
        price: options.priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      application_fee_percent: PLATFORM_FEE_PERCENT,
      transfer_data: {
        destination: options.creatorStripeAccountId,
      },
      trial_period_days:
        options.trialPeriodDays && options.trialPeriodDays > 0
          ? options.trialPeriodDays
          : undefined,
      metadata: {
        creatorId: options.creatorId,
        userId: options.userId,
        platform: "breathwithmagic",
      },
    },
    metadata: {
      creatorId: options.creatorId,
      userId: options.userId,
      platform: "breathwithmagic",
    },
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    // Allow promotion codes for future marketing
    allow_promotion_codes: true,
    // Collect billing address for tax purposes
    billing_address_collection: "auto",
  });

  return session;
}

/**
 * Create a billing portal session for subscription management
 *
 * @param customerId - Stripe Customer ID
 * @param returnUrl - URL to redirect to after portal session
 * @returns Stripe Billing Portal Session
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string,
): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Cancel a subscription at period end
 *
 * @param subscriptionId - Stripe Subscription ID
 * @returns Updated Stripe Subscription
 */
export async function cancelSubscriptionAtPeriodEnd(
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  return subscription;
}

/**
 * Reactivate a subscription that was set to cancel at period end
 *
 * @param subscriptionId - Stripe Subscription ID
 * @returns Updated Stripe Subscription
 */
export async function reactivateSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });

  return subscription;
}

/**
 * Retrieve a subscription from Stripe
 *
 * @param subscriptionId - Stripe Subscription ID
 * @returns Stripe Subscription
 */
export async function retrieveSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Type exports for use in other files
 */
export type { Stripe };
