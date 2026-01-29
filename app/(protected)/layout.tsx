import { MobileNav, MobileNavSpacer } from "@/components/layout";

/**
 * Protected Layout
 *
 * Layout for all authenticated user pages.
 * Includes mobile bottom navigation for easy access on small screens.
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      {/* Mobile bottom navigation spacer to prevent content overlap */}
      <MobileNavSpacer />
      {/* Mobile bottom navigation - visible only on mobile */}
      <MobileNav />
    </>
  );
}
