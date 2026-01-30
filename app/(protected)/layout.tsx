import { MobileNav, MobileNavSpacer, SmartHeader } from "@/components/layout";
import { SkipLink } from "@/components/ui/skip-link";

/**
 * Protected Layout
 *
 * Layout for all authenticated user pages.
 * Provides consistent navigation:
 * - SmartHeader with full navigation on desktop
 * - Mobile bottom navigation for easy access on small screens
 * - Skip link for accessibility
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SkipLink />
      <div className="min-h-screen bg-background">
        {/* Consistent header with full navigation */}
        <SmartHeader />
        {/* Page content */}
        <main id="main-content">
          {children}
        </main>
      </div>
      {/* Mobile bottom navigation spacer to prevent content overlap */}
      <MobileNavSpacer />
      {/* Mobile bottom navigation - visible only on mobile */}
      <MobileNav />
    </>
  );
}
