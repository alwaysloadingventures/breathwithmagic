import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

/**
 * Base URL for the site
 * In production, this should be set via NEXT_PUBLIC_APP_URL environment variable
 */
const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://breathwithmagic.com";

/**
 * Dynamic sitemap generation
 *
 * Generates a sitemap including:
 * - Static pages (homepage, explore, terms, privacy)
 * - Dynamic creator profiles (active creators only)
 * - Dynamic content pages (published, free content only)
 *
 * Priority levels:
 * - Homepage: 1.0
 * - Explore: 0.9
 * - Creator profiles: 0.8
 * - Content pages: 0.6
 * - Static pages (terms, privacy): 0.3
 *
 * Uses cursor-based pagination for large datasets to avoid memory issues.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sitemapEntries: MetadataRoute.Sitemap = [];

  // Static pages
  sitemapEntries.push(
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/explore`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    }
  );

  // Fetch all active creator profiles with cursor-based pagination
  // to handle potentially large datasets efficiently
  const PAGE_SIZE = 100;
  let creatorCursor: string | undefined;
  let hasMoreCreators = true;

  while (hasMoreCreators) {
    const creators = await prisma.creatorProfile.findMany({
      where: {
        status: "active",
        stripeOnboardingComplete: true,
      },
      select: {
        handle: true,
        updatedAt: true,
      },
      orderBy: { id: "asc" },
      take: PAGE_SIZE + 1,
      ...(creatorCursor && {
        cursor: { id: creatorCursor },
        skip: 1,
      }),
    });

    // Check if there are more results
    hasMoreCreators = creators.length > PAGE_SIZE;
    const creatorsToProcess = hasMoreCreators
      ? creators.slice(0, PAGE_SIZE)
      : creators;

    // Add creator profile pages
    for (const creator of creatorsToProcess) {
      sitemapEntries.push({
        url: `${baseUrl}/${creator.handle}`,
        lastModified: creator.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }

    // Update cursor for next iteration
    if (hasMoreCreators && creatorsToProcess.length > 0) {
      // We need to fetch the ID for the cursor
      const lastCreator = await prisma.creatorProfile.findFirst({
        where: {
          handle: creatorsToProcess[creatorsToProcess.length - 1].handle,
        },
        select: { id: true },
      });
      creatorCursor = lastCreator?.id;
    }
  }

  // Fetch all published, free content with cursor-based pagination
  // Only free content is included in sitemap as paid content is gated
  let contentCursor: string | undefined;
  let hasMoreContent = true;

  while (hasMoreContent) {
    const content = await prisma.content.findMany({
      where: {
        status: "published",
        isFree: true,
        creator: {
          status: "active",
          stripeOnboardingComplete: true,
        },
      },
      select: {
        id: true,
        updatedAt: true,
        publishedAt: true,
        creator: {
          select: {
            handle: true,
          },
        },
      },
      orderBy: { id: "asc" },
      take: PAGE_SIZE + 1,
      ...(contentCursor && {
        cursor: { id: contentCursor },
        skip: 1,
      }),
    });

    // Check if there are more results
    hasMoreContent = content.length > PAGE_SIZE;
    const contentToProcess = hasMoreContent
      ? content.slice(0, PAGE_SIZE)
      : content;

    // Add content pages
    for (const item of contentToProcess) {
      sitemapEntries.push({
        url: `${baseUrl}/${item.creator.handle}/post/${item.id}`,
        lastModified: item.updatedAt || item.publishedAt || new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }

    // Update cursor for next iteration
    if (hasMoreContent && contentToProcess.length > 0) {
      contentCursor = contentToProcess[contentToProcess.length - 1].id;
    }
  }

  return sitemapEntries;
}
