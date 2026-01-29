/**
 * Service Status Utilities
 *
 * Provides health check utilities and graceful degradation helpers
 * for handling third-party service outages.
 *
 * @see PRD Task 20: Error handling & edge cases
 */

import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/cache";

/**
 * Service status types
 */
export type ServiceStatus = "healthy" | "degraded" | "unavailable";

export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  latencyMs?: number;
  lastChecked: Date;
  error?: string;
}

export interface HealthCheckResult {
  overall: ServiceStatus;
  services: ServiceHealth[];
  timestamp: Date;
}

// =============================================================================
// HEALTH CHECK FUNCTIONS
// =============================================================================

/**
 * Check database health
 */
export async function checkDatabaseHealth(): Promise<ServiceHealth> {
  const start = Date.now();
  const serviceName = "database";

  try {
    // Simple query to check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;

    return {
      name: serviceName,
      status: latencyMs > 500 ? "degraded" : "healthy",
      latencyMs,
      lastChecked: new Date(),
    };
  } catch (error) {
    return {
      name: serviceName,
      status: "unavailable",
      lastChecked: new Date(),
      error: error instanceof Error ? error.message : "Database connection failed",
    };
  }
}

/**
 * Check Redis/cache health
 */
export async function checkCacheHealth(): Promise<ServiceHealth> {
  const start = Date.now();
  const serviceName = "cache";

  try {
    // Check if Redis is available
    if (!redis) {
      return {
        name: serviceName,
        status: "unavailable",
        lastChecked: new Date(),
        error: "Redis not configured",
      };
    }

    // Simple ping to check Redis connectivity
    await redis.ping();
    const latencyMs = Date.now() - start;

    return {
      name: serviceName,
      status: latencyMs > 100 ? "degraded" : "healthy",
      latencyMs,
      lastChecked: new Date(),
    };
  } catch (error) {
    return {
      name: serviceName,
      status: "degraded", // Cache failures are non-critical
      lastChecked: new Date(),
      error: error instanceof Error ? error.message : "Cache connection failed",
    };
  }
}

/**
 * Check Stripe health (basic connectivity)
 * Note: We don't want to make actual Stripe API calls on every health check
 * as they count against rate limits. This is a placeholder for when
 * we have Stripe status API integration or webhooks indicate issues.
 */
export async function checkStripeHealth(): Promise<ServiceHealth> {
  const serviceName = "stripe";

  // In production, you might:
  // 1. Check Stripe's status page API
  // 2. Track recent webhook delivery success rate
  // 3. Monitor recent API call failures

  // For now, assume healthy unless we've detected issues
  return {
    name: serviceName,
    status: "healthy",
    lastChecked: new Date(),
  };
}

/**
 * Check Cloudflare (R2/Stream) health
 * Similar to Stripe, we don't want to make unnecessary API calls
 */
export async function checkStorageHealth(): Promise<ServiceHealth> {
  const serviceName = "storage";

  // In production, you might:
  // 1. Check Cloudflare's status page
  // 2. Track recent upload/download success rates
  // 3. Monitor recent API call failures

  return {
    name: serviceName,
    status: "healthy",
    lastChecked: new Date(),
  };
}

/**
 * Run all health checks
 */
export async function runHealthChecks(): Promise<HealthCheckResult> {
  const results = await Promise.allSettled([
    checkDatabaseHealth(),
    checkCacheHealth(),
    checkStripeHealth(),
    checkStorageHealth(),
  ]);

  const services: ServiceHealth[] = results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    // Map index to service name for failed checks
    const serviceNames = ["database", "cache", "stripe", "storage"];
    return {
      name: serviceNames[index],
      status: "unavailable" as ServiceStatus,
      lastChecked: new Date(),
      error: result.reason instanceof Error ? result.reason.message : "Health check failed",
    };
  });

  // Determine overall status
  const hasUnavailable = services.some((s) => s.status === "unavailable");
  const hasDegraded = services.some((s) => s.status === "degraded");

  let overall: ServiceStatus = "healthy";
  if (hasUnavailable) {
    // Database unavailable is critical
    const dbStatus = services.find((s) => s.name === "database");
    overall = dbStatus?.status === "unavailable" ? "unavailable" : "degraded";
  } else if (hasDegraded) {
    overall = "degraded";
  }

  return {
    overall,
    services,
    timestamp: new Date(),
  };
}

// =============================================================================
// GRACEFUL DEGRADATION HELPERS
// =============================================================================

/**
 * Check if a specific service is available
 * Uses cached status to avoid repeated health checks
 */
let cachedHealthStatus: HealthCheckResult | null = null;
let healthCheckTimestamp = 0;
const HEALTH_CHECK_CACHE_MS = 30000; // 30 seconds

export async function getServiceStatus(
  serviceName: "database" | "cache" | "stripe" | "storage",
): Promise<ServiceStatus> {
  const now = Date.now();

  // Return cached status if recent
  if (cachedHealthStatus && now - healthCheckTimestamp < HEALTH_CHECK_CACHE_MS) {
    const service = cachedHealthStatus.services.find((s) => s.name === serviceName);
    return service?.status ?? "unavailable";
  }

  // Run fresh health checks
  cachedHealthStatus = await runHealthChecks();
  healthCheckTimestamp = now;

  const service = cachedHealthStatus.services.find((s) => s.name === serviceName);
  return service?.status ?? "unavailable";
}

/**
 * Check if payments are available
 */
export async function isPaymentServiceAvailable(): Promise<boolean> {
  const status = await getServiceStatus("stripe");
  return status !== "unavailable";
}

/**
 * Check if storage is available
 */
export async function isStorageServiceAvailable(): Promise<boolean> {
  const status = await getServiceStatus("storage");
  return status !== "unavailable";
}

/**
 * Check if database is available
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  const status = await getServiceStatus("database");
  return status !== "unavailable";
}

// =============================================================================
// SERVICE OUTAGE MESSAGES
// =============================================================================

/**
 * User-friendly messages for service outages
 */
export const SERVICE_OUTAGE_MESSAGES = {
  database: {
    title: "We're having some trouble",
    message:
      "Our systems are temporarily unavailable. We're working to fix this and appreciate your patience.",
    action: "Please try again in a few minutes.",
  },
  stripe: {
    title: "Payments temporarily unavailable",
    message:
      "We're having trouble connecting to our payment processor. Your subscription and access are not affected.",
    action: "Please try again later to make changes to your billing.",
  },
  storage: {
    title: "Media temporarily unavailable",
    message:
      "We're having trouble loading some content. Your account and subscriptions are not affected.",
    action: "Please refresh the page or try again in a few minutes.",
  },
  cache: {
    // Cache failures are usually invisible to users
    title: "Performance may be affected",
    message: "Some pages might load slower than usual right now.",
    action: null,
  },
} as const;

/**
 * Get user-friendly outage message for a service
 */
export function getOutageMessage(
  serviceName: keyof typeof SERVICE_OUTAGE_MESSAGES,
): (typeof SERVICE_OUTAGE_MESSAGES)[typeof serviceName] {
  return SERVICE_OUTAGE_MESSAGES[serviceName];
}
