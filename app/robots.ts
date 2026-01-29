import { MetadataRoute } from "next";

/**
 * Base URL for the site
 * In production, this should be set via NEXT_PUBLIC_APP_URL environment variable
 */
const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://breathwithmagic.com";

/**
 * robots.txt configuration
 *
 * Allows crawling of public pages while blocking:
 * - API routes (internal endpoints)
 * - Creator dashboard (authenticated area)
 * - User home feed (authenticated area)
 * - Settings pages (authenticated area)
 * - Messages (private communications)
 * - Notifications (private user data)
 * - Admin pages (internal)
 * - Onboarding flows (authenticated)
 * - Sign-in/sign-up pages (handled by Clerk)
 *
 * References the sitemap for search engine discovery.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/explore",
          "/terms",
          "/privacy",
          "/become-creator",
        ],
        disallow: [
          // API routes - internal endpoints
          "/api/*",

          // Authenticated user areas
          "/home",
          "/home/*",
          "/settings",
          "/settings/*",
          "/subscriptions",
          "/subscriptions/*",
          "/following",
          "/following/*",
          "/messages",
          "/messages/*",
          "/notifications",
          "/notifications/*",

          // Creator dashboard - authenticated
          "/creator/*",

          // Admin areas
          "/admin/*",

          // Onboarding flows - authenticated
          "/onboarding/*",

          // Auth pages - handled by Clerk
          "/sign-in",
          "/sign-in/*",
          "/sign-up",
          "/sign-up/*",

          // Unsubscribe pages - user-specific
          "/unsubscribe/*",
        ],
      },
      // Block common bad bots
      {
        userAgent: "GPTBot",
        disallow: ["/"],
      },
      {
        userAgent: "ChatGPT-User",
        disallow: ["/"],
      },
      {
        userAgent: "CCBot",
        disallow: ["/"],
      },
      {
        userAgent: "Google-Extended",
        disallow: ["/"],
      },
      {
        userAgent: "anthropic-ai",
        disallow: ["/"],
      },
      {
        userAgent: "Claude-Web",
        disallow: ["/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
