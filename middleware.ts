import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Define protected routes that REQUIRE authentication
 *
 * We use an allowlist of protected routes rather than public routes because:
 * - Creator profiles use dynamic routes at /{handle} (e.g., /sarahbreath)
 * - These should be publicly accessible for discovery
 * - It's easier to list the known protected routes
 */
const isProtectedRoute = createRouteMatcher([
  // Authenticated user pages
  "/home(.*)",
  "/following(.*)",
  "/subscriptions(.*)",
  "/settings(.*)",
  "/messages(.*)",
  "/notifications(.*)",
  // Creator dashboard
  "/creator(.*)",
  // Protected API routes (not webhooks)
  "/api/creator(.*)",
  "/api/subscriptions(.*)",
  "/api/follow(.*)",
  "/api/user(.*)",
  "/api/messages(.*)",
  "/api/notifications(.*)",
  "/api/content(.*)",
  "/api/admin(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  // Only protect explicitly listed routes
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
