/**
 * Admin Access Validation Middleware
 *
 * Provides functions to verify user has admin privileges.
 * Used to protect admin-only routes and API endpoints.
 *
 * @see PRD Phase 6, Task 18: Content Moderation
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// =============================================================================
// TYPES
// =============================================================================

export interface AdminCheckResult {
  /** Whether the user is an admin */
  isAdmin: boolean;
  /** The user's internal ID (if authenticated) */
  userId?: string;
  /** Error message if not admin */
  error?: string;
  /** HTTP status code for the error */
  statusCode?: number;
}

// =============================================================================
// MAIN ADMIN CHECK FUNCTION
// =============================================================================

/**
 * Check if the current user is an admin
 *
 * This function verifies:
 * 1. User is authenticated via Clerk
 * 2. User exists in our database
 * 3. User has isAdmin flag set to true
 *
 * @returns AdminCheckResult with isAdmin status and user details
 */
export async function checkIsAdmin(): Promise<AdminCheckResult> {
  try {
    // Check authentication
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return {
        isAdmin: false,
        error: "Authentication required",
        statusCode: 401,
      };
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        id: true,
        isAdmin: true,
      },
    });

    if (!user) {
      return {
        isAdmin: false,
        error: "User not found",
        statusCode: 404,
      };
    }

    if (!user.isAdmin) {
      return {
        isAdmin: false,
        userId: user.id,
        error: "Admin access required",
        statusCode: 403,
      };
    }

    return {
      isAdmin: true,
      userId: user.id,
    };
  } catch (error) {
    console.error("Admin check error:", error);
    return {
      isAdmin: false,
      error: "Failed to verify admin status",
      statusCode: 500,
    };
  }
}

// =============================================================================
// API ROUTE HELPER
// =============================================================================

/**
 * Require admin access for an API route
 *
 * Returns a NextResponse with appropriate error if user is not admin,
 * or null if the user is admin and the request should proceed.
 *
 * Usage:
 * ```ts
 * const adminCheck = await requireAdmin();
 * if (adminCheck.error) {
 *   return adminCheck.error;
 * }
 * // adminCheck.userId is available for use
 * ```
 */
export async function requireAdmin(): Promise<{
  error: NextResponse | null;
  userId: string | null;
}> {
  const result = await checkIsAdmin();

  if (!result.isAdmin) {
    return {
      error: NextResponse.json(
        {
          error: result.error || "Admin access required",
          code: result.statusCode === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        },
        { status: result.statusCode || 403 }
      ),
      userId: null,
    };
  }

  return {
    error: null,
    userId: result.userId || null,
  };
}

// =============================================================================
// SERVER COMPONENT HELPER
// =============================================================================

/**
 * Check admin status for Server Components
 *
 * Returns the admin check result for use in Server Components
 * to conditionally render admin-only content or redirect.
 */
export async function getAdminStatus(): Promise<AdminCheckResult> {
  return checkIsAdmin();
}
