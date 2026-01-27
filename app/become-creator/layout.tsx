import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Become a Creator | breathwithmagic",
  description:
    "Create your practice space and share your teaching with the world. Join breathwithmagic as a creator.",
};

/**
 * Layout for the creator onboarding flow.
 *
 * Provides a minimal, focused layout that keeps the user's attention
 * on the onboarding steps. Includes a simple header with logo and exit option.
 */
export default function BecomeCreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Simple header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link
            href="/"
            className="text-lg font-semibold text-foreground transition-colors hover:text-primary"
          >
            breathwithmagic
          </Link>
          <Link
            href="/home"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Exit
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">{children}</main>

      {/* Simple footer */}
      <footer className="border-t border-border py-6">
        <div className="mx-auto max-w-2xl px-4 text-center text-sm text-muted-foreground">
          <p>
            By becoming a creator, you agree to our{" "}
            <Link
              href="/terms"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </footer>
    </div>
  );
}
