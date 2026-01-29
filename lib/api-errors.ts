/**
 * API Error Utilities
 *
 * Provides consistent error response formatting across all API routes.
 * Follows the PRD specification:
 * { "error": "Human-readable message", "code": "ERROR_CODE" }
 *
 * @see PRD API Conventions section
 */

import { NextResponse } from "next/server";

/**
 * Standard error codes used across the API
 */
export const ERROR_CODES = {
  // Auth errors
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",

  // Resource errors
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",

  // Validation errors
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",

  // Rate limiting
  RATE_LIMITED: "RATE_LIMITED",

  // Subscription errors
  SUBSCRIPTION_REQUIRED: "SUBSCRIPTION_REQUIRED",
  SUBSCRIPTION_EXPIRED: "SUBSCRIPTION_EXPIRED",
  PAYMENT_FAILED: "PAYMENT_FAILED",

  // Content errors
  CONTENT_NOT_AVAILABLE: "CONTENT_NOT_AVAILABLE",
  CONTENT_DELETED: "CONTENT_DELETED",

  // Service errors
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  STRIPE_ERROR: "STRIPE_ERROR",
  STORAGE_ERROR: "STORAGE_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",

  // Generic errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
  BAD_REQUEST: "BAD_REQUEST",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Standard API error response interface
 */
export interface ApiErrorResponse {
  error: string;
  code: ErrorCode;
  details?: Record<string, unknown>;
}

/**
 * Create a standardized error response
 *
 * @param message - Human-readable error message
 * @param code - Error code from ERROR_CODES
 * @param status - HTTP status code
 * @param details - Optional additional details
 * @returns NextResponse with consistent error format
 */
export function apiError(
  message: string,
  code: ErrorCode,
  status: number,
  details?: Record<string, unknown>,
): NextResponse<ApiErrorResponse> {
  const body: ApiErrorResponse = {
    error: message,
    code,
  };

  if (details) {
    body.details = details;
  }

  return NextResponse.json(body, { status });
}

// =============================================================================
// CONVENIENCE ERROR HELPERS
// =============================================================================

/**
 * 400 Bad Request error
 */
export function badRequestError(
  message = "Invalid request",
  details?: Record<string, unknown>,
): NextResponse<ApiErrorResponse> {
  return apiError(message, ERROR_CODES.BAD_REQUEST, 400, details);
}

/**
 * 401 Unauthorized error
 */
export function unauthorizedError(
  message = "Please sign in to continue",
): NextResponse<ApiErrorResponse> {
  return apiError(message, ERROR_CODES.UNAUTHORIZED, 401);
}

/**
 * 403 Forbidden error
 */
export function forbiddenError(
  message = "You don't have permission to access this resource",
): NextResponse<ApiErrorResponse> {
  return apiError(message, ERROR_CODES.FORBIDDEN, 403);
}

/**
 * 404 Not Found error
 */
export function notFoundError(
  resource: string,
): NextResponse<ApiErrorResponse> {
  return apiError(
    `We couldn't find that ${resource.toLowerCase()}. It may have been removed or the link might be incorrect.`,
    ERROR_CODES.NOT_FOUND,
    404,
  );
}

/**
 * 409 Conflict / Already Exists error
 */
export function alreadyExistsError(
  resource: string,
): NextResponse<ApiErrorResponse> {
  return apiError(
    `This ${resource.toLowerCase()} already exists`,
    ERROR_CODES.ALREADY_EXISTS,
    409,
  );
}

/**
 * 422 Validation error
 */
export function validationError(
  message: string,
  details?: Record<string, unknown>,
): NextResponse<ApiErrorResponse> {
  return apiError(message, ERROR_CODES.VALIDATION_ERROR, 422, details);
}

/**
 * 429 Rate Limited error
 */
export function rateLimitedError(
  retryAfterSeconds?: number,
): NextResponse<ApiErrorResponse> {
  const response = apiError(
    "You're making requests too quickly. Please wait a moment and try again.",
    ERROR_CODES.RATE_LIMITED,
    429,
  );

  if (retryAfterSeconds) {
    response.headers.set("Retry-After", String(retryAfterSeconds));
  }

  return response;
}

/**
 * 402 Payment Required / Subscription Required error
 */
export function subscriptionRequiredError(
  creatorName?: string,
): NextResponse<ApiErrorResponse> {
  const message = creatorName
    ? `Subscribe to ${creatorName} to access this content`
    : "A subscription is required to access this content";

  return apiError(message, ERROR_CODES.SUBSCRIPTION_REQUIRED, 402);
}

/**
 * 402 Subscription Expired error
 */
export function subscriptionExpiredError(): NextResponse<ApiErrorResponse> {
  return apiError(
    "Your subscription has expired. Please renew to continue accessing this content.",
    ERROR_CODES.SUBSCRIPTION_EXPIRED,
    402,
  );
}

/**
 * 402 Payment Failed error
 */
export function paymentFailedError(): NextResponse<ApiErrorResponse> {
  return apiError(
    "We couldn't process your payment. Please update your payment method to continue.",
    ERROR_CODES.PAYMENT_FAILED,
    402,
  );
}

/**
 * 410 Content Not Available error
 */
export function contentNotAvailableError(): NextResponse<ApiErrorResponse> {
  return apiError(
    "This content is no longer available",
    ERROR_CODES.CONTENT_NOT_AVAILABLE,
    410,
  );
}

/**
 * 503 Service Unavailable error
 */
export function serviceUnavailableError(
  service: string,
): NextResponse<ApiErrorResponse> {
  return apiError(
    `${service} is temporarily unavailable. Please try again in a few minutes.`,
    ERROR_CODES.SERVICE_UNAVAILABLE,
    503,
  );
}

/**
 * 500 Internal Server Error
 */
export function internalError(
  message = "Something went wrong on our end. Please try again.",
): NextResponse<ApiErrorResponse> {
  return apiError(message, ERROR_CODES.INTERNAL_ERROR, 500);
}

// =============================================================================
// SPECIFIC SERVICE ERROR HELPERS
// =============================================================================

/**
 * Stripe-related error
 */
export function stripeError(
  message = "We're having trouble processing payments right now. Please try again.",
): NextResponse<ApiErrorResponse> {
  return apiError(message, ERROR_CODES.STRIPE_ERROR, 503);
}

/**
 * Storage-related error (R2/Cloudflare)
 */
export function storageError(
  message = "We're having trouble accessing files right now. Please try again.",
): NextResponse<ApiErrorResponse> {
  return apiError(message, ERROR_CODES.STORAGE_ERROR, 503);
}

/**
 * Database-related error
 */
export function databaseError(
  message = "We're having trouble saving your data. Please try again.",
): NextResponse<ApiErrorResponse> {
  return apiError(message, ERROR_CODES.DATABASE_ERROR, 503);
}

// =============================================================================
// ERROR HANDLING UTILITIES
// =============================================================================

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unexpected error occurred";
}

/**
 * Log error with context and return appropriate API response
 * Use this in catch blocks for consistent error handling
 *
 * @param error - The caught error
 * @param context - Context string (e.g., "creating subscription")
 * @param fallbackMessage - User-friendly fallback message
 */
export function handleApiError(
  error: unknown,
  context: string,
  fallbackMessage = "Something went wrong. Please try again.",
): NextResponse<ApiErrorResponse> {
  const errorMessage = getErrorMessage(error);

  // Log the full error for debugging
  console.error(`Error ${context}:`, error);

  // Check for specific error types

  // Prisma errors
  if (error && typeof error === "object" && "code" in error) {
    const prismaError = error as { code: string };

    // Unique constraint violation
    if (prismaError.code === "P2002") {
      return alreadyExistsError("record");
    }

    // Not found
    if (prismaError.code === "P2025") {
      return notFoundError("record");
    }

    // Database connection error
    if (
      prismaError.code === "P1001" ||
      prismaError.code === "P1002" ||
      prismaError.code === "P2024"
    ) {
      return databaseError();
    }
  }

  // Network/timeout errors
  if (errorMessage.includes("ETIMEDOUT") || errorMessage.includes("ECONNREFUSED")) {
    return serviceUnavailableError("Our services are");
  }

  // Default to internal error
  return internalError(fallbackMessage);
}
