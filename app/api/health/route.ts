/**
 * GET /api/health
 *
 * Health check endpoint for monitoring service status.
 * Returns the health status of all dependencies.
 *
 * Response:
 * - 200: All services healthy
 * - 503: One or more critical services unavailable
 *
 * @see PRD API Routes: /api/health - Health check (all dependencies)
 */

import { NextResponse } from "next/server";
import { runHealthChecks, type HealthCheckResult } from "@/lib/service-status";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(): Promise<NextResponse<HealthCheckResult>> {
  const result = await runHealthChecks();

  // Return 503 if critical services are unavailable
  const status = result.overall === "unavailable" ? 503 : 200;

  return NextResponse.json(result, { status });
}
