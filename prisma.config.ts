// Prisma configuration for breathwithmagic
// Using Neon PostgreSQL with connection pooling

import * as dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Load environment variables from .env.local (development) or .env (production)
// Order: .env.local takes precedence over .env
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // For Neon, use the direct URL for migrations to bypass connection pooling
    // The directUrl property is supported at runtime even though TypeScript definitions may lag
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
