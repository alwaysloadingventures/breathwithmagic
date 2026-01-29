"use client";

import Link from "next/link";
import { NotificationBell } from "@/components/notifications";

/**
 * Creator Dashboard Header
 *
 * Shared header for all creator dashboard pages.
 */
export function CreatorHeader() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-6">
        <Link
          href="/creator/dashboard"
          className="text-lg font-semibold text-foreground transition-colors hover:text-primary"
        >
          breathwithmagic
        </Link>
        <nav className="flex items-center gap-2">
          <NotificationBell />
          <Link
            href="/home"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground ml-2"
          >
            Browse
          </Link>
        </nav>
      </div>
    </header>
  );
}
