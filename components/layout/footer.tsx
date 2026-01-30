import Link from "next/link";

/**
 * Footer - Site footer for public pages
 *
 * Features:
 * - Brand name and copyright
 * - Links to Privacy Policy and Terms of Service
 * - Minimal, calm design matching the breathwithmagic brand
 * - Responsive layout
 */
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-muted/30 py-8" role="contentinfo">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3 h-3 text-primary"
                aria-hidden="true"
              >
                <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" />
                <path d="M17 4a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2" />
              </svg>
            </div>
            <span className="text-sm font-medium text-foreground">
              breathwithmagic
            </span>
          </div>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} breathwithmagic. All rights reserved.
          </p>

          {/* Legal Links */}
          <nav aria-label="Legal" className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <span className="text-muted-foreground/50" aria-hidden="true">
              &middot;
            </span>
            <Link
              href="/terms"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

/**
 * PublicFooter - Alias for Footer for consistency with PublicHeader naming
 */
export { Footer as PublicFooter };
