/**
 * Prisma Client Singleton for serverless environments
 *
 * This pattern prevents exhausting database connections during development
 * with hot reloading and ensures a single PrismaClient instance is reused.
 *
 * In Prisma 7, we use the @prisma/adapter-pg adapter for PostgreSQL connections.
 * The adapter handles connection pooling and is optimized for serverless.
 *
 * @see https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Creates a configured PrismaClient instance with PostgreSQL adapter
 * Uses DATABASE_URL for pooled connections (optimal for serverless)
 */
function createPrismaClient(): PrismaClient {
  // Create a PostgreSQL connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Optimize for serverless: fewer connections, shorter idle timeout
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  // Create the Prisma PostgreSQL adapter
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Export type helpers for use throughout the application
 */
export type { Prisma } from "@prisma/client";
