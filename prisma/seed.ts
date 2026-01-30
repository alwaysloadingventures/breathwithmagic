/**
 * Prisma Seed Script for breathwithmagic
 *
 * Creates sample creators and content for development and testing.
 * Run with: npm run db:seed
 */
import { PrismaClient, CreatorCategory, ContentType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

// Create a PostgreSQL connection pool (same pattern as lib/prisma.ts)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Create the Prisma PostgreSQL adapter
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create sample users (these would normally be created via Clerk webhooks)
  const sampleUsers = await Promise.all([
    prisma.user.upsert({
      where: { clerkId: "user_sample_creator_1" },
      update: {},
      create: {
        clerkId: "user_sample_creator_1",
        email: "sarah@example.com",
        name: "Sarah Thompson",
        role: "creator",
      },
    }),
    prisma.user.upsert({
      where: { clerkId: "user_sample_creator_2" },
      update: {},
      create: {
        clerkId: "user_sample_creator_2",
        email: "marcus@example.com",
        name: "Marcus Chen",
        role: "creator",
      },
    }),
    prisma.user.upsert({
      where: { clerkId: "user_sample_creator_3" },
      update: {},
      create: {
        clerkId: "user_sample_creator_3",
        email: "luna@example.com",
        name: "Luna Martinez",
        role: "creator",
      },
    }),
    prisma.user.upsert({
      where: { clerkId: "user_sample_subscriber_1" },
      update: {},
      create: {
        clerkId: "user_sample_subscriber_1",
        email: "john@example.com",
        name: "John Doe",
        role: "user",
      },
    }),
  ]);

  const [sarah, marcus, luna] = sampleUsers;

  // Create creator profiles
  const sarahProfile = await prisma.creatorProfile.upsert({
    where: { userId: sarah.id },
    update: { stripeOnboardingComplete: true },
    create: {
      userId: sarah.id,
      handle: "sarahbreath",
      displayName: "Sarah Thompson",
      bio: "Certified breathwork facilitator helping you find calm in chaos. 10+ years of practice.",
      category: CreatorCategory.Breathwork,
      subscriptionPrice: "TIER_1000",
      status: "active",
      isVerified: true,
      isFeatured: true,
      stripeOnboardingComplete: true, // For seed data to show up on explore
    },
  });

  const marcusProfile = await prisma.creatorProfile.upsert({
    where: { userId: marcus.id },
    update: { stripeOnboardingComplete: true },
    create: {
      userId: marcus.id,
      handle: "marcusyoga",
      displayName: "Marcus Chen",
      bio: "Vinyasa and restorative yoga for all levels. Let's flow together.",
      category: CreatorCategory.Yoga,
      subscriptionPrice: "TIER_2000",
      status: "active",
      isFeatured: true,
      stripeOnboardingComplete: true, // For seed data to show up on explore
    },
  });

  const lunaProfile = await prisma.creatorProfile.upsert({
    where: { userId: luna.id },
    update: { stripeOnboardingComplete: true },
    create: {
      userId: luna.id,
      handle: "lunasounds",
      displayName: "Luna Martinez",
      bio: "Sound healer and meditation guide. Discover the power of vibrational healing.",
      category: CreatorCategory.SoundHealing,
      subscriptionPrice: "TIER_1000",
      status: "active",
      stripeOnboardingComplete: true, // For seed data to show up on explore
    },
  });

  // Create programs for Sarah
  const sarahProgram = await prisma.program.upsert({
    where: { id: "seed_program_sarah_1" },
    update: {},
    create: {
      id: "seed_program_sarah_1",
      creatorId: sarahProfile.id,
      title: "30 Days to Calm",
      description:
        "A transformative journey through daily breathwork practices. Perfect for beginners.",
      isFree: false,
      sortOrder: 1,
      publishedAt: new Date(),
    },
  });

  // Create content for Sarah
  await Promise.all([
    prisma.content.upsert({
      where: { id: "seed_content_sarah_1" },
      update: {},
      create: {
        id: "seed_content_sarah_1",
        creatorId: sarahProfile.id,
        programId: sarahProgram.id,
        type: ContentType.video,
        title: "Welcome to Your Breath Journey",
        description:
          "An introduction to the 30 Days to Calm program. Learn the fundamentals.",
        duration: 600,
        isFree: true,
        status: "published",
        sortOrder: 1,
        publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.content.upsert({
      where: { id: "seed_content_sarah_2" },
      update: {},
      create: {
        id: "seed_content_sarah_2",
        creatorId: sarahProfile.id,
        programId: sarahProgram.id,
        type: ContentType.video,
        title: "Day 1: Finding Your Natural Rhythm",
        description:
          "Discover your breath's natural rhythm and learn the foundation of conscious breathing.",
        duration: 900,
        isFree: false,
        status: "published",
        sortOrder: 2,
        publishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.content.upsert({
      where: { id: "seed_content_sarah_3" },
      update: {},
      create: {
        id: "seed_content_sarah_3",
        creatorId: sarahProfile.id,
        type: ContentType.audio,
        title: "Morning Energizing Breath",
        description:
          "A quick 5-minute practice to start your day with energy and clarity.",
        duration: 300,
        isFree: true,
        status: "published",
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  // Create content for Marcus
  await Promise.all([
    prisma.content.upsert({
      where: { id: "seed_content_marcus_1" },
      update: {},
      create: {
        id: "seed_content_marcus_1",
        creatorId: marcusProfile.id,
        type: ContentType.video,
        title: "Gentle Morning Flow",
        description:
          "Wake up your body with this gentle 20-minute vinyasa sequence.",
        duration: 1200,
        isFree: true,
        status: "published",
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.content.upsert({
      where: { id: "seed_content_marcus_2" },
      update: {},
      create: {
        id: "seed_content_marcus_2",
        creatorId: marcusProfile.id,
        type: ContentType.video,
        title: "Power Vinyasa: Full Body Strength",
        description:
          "An intense 45-minute practice for building strength and endurance.",
        duration: 2700,
        isFree: false,
        status: "published",
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  // Create content for Luna
  await Promise.all([
    prisma.content.upsert({
      where: { id: "seed_content_luna_1" },
      update: {},
      create: {
        id: "seed_content_luna_1",
        creatorId: lunaProfile.id,
        type: ContentType.audio,
        title: "Tibetan Singing Bowls Meditation",
        description:
          "Immerse yourself in the healing vibrations of Tibetan singing bowls.",
        duration: 1800,
        isFree: true,
        status: "published",
        publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.content.upsert({
      where: { id: "seed_content_luna_2" },
      update: {},
      create: {
        id: "seed_content_luna_2",
        creatorId: lunaProfile.id,
        type: ContentType.audio,
        title: "Sleep Sound Bath",
        description:
          "Drift into peaceful sleep with this 30-minute sound healing journey.",
        duration: 1800,
        isFree: false,
        status: "published",
        publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  console.log("Seeding completed!");
  console.log(`Created ${sampleUsers.length} users`);
  console.log(`Created 3 creator profiles`);
  console.log(`Created 1 program`);
  console.log(`Created 7 content items`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
