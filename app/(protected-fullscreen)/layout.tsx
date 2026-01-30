/**
 * Protected Fullscreen Layout
 *
 * Layout for authenticated pages that require a full-screen experience
 * without the standard navigation (SmartHeader, MobileNav).
 *
 * Use this for:
 * - Chat/conversation views with custom headers
 * - Video players
 * - Other immersive experiences
 *
 * Auth protection is handled by individual pages using Clerk's auth.
 */
export default function ProtectedFullscreenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
