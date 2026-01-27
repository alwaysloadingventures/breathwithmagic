"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Video,
  BarChart3,
  Users,
  Settings,
  ExternalLink,
} from "lucide-react";

interface CreatorNavProps {
  handle: string;
}

const navItems = [
  {
    label: "Dashboard",
    href: "/creator/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Content",
    href: "/creator/content",
    icon: Video,
  },
  {
    label: "Analytics",
    href: "/creator/analytics",
    icon: BarChart3,
  },
  {
    label: "Subscribers",
    href: "/creator/subscribers",
    icon: Users,
  },
  {
    label: "Settings",
    href: "/creator/settings",
    icon: Settings,
  },
];

/**
 * Creator Navigation Component
 *
 * Navigation sidebar/header for creator dashboard pages.
 * Shows active state based on current path.
 */
export function CreatorNav({ handle }: CreatorNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-col gap-1"
      role="navigation"
      aria-label="Creator navigation"
    >
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/creator/dashboard" &&
            pathname.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors min-h-[44px]",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="size-5" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}

      {/* Divider */}
      <div className="my-2 h-px bg-border" role="separator" />

      {/* View Profile Link */}
      <Link
        href={`/${handle}`}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground min-h-[44px]"
        target="_blank"
        rel="noopener noreferrer"
      >
        <ExternalLink className="size-5" aria-hidden="true" />
        View Profile
        <span className="sr-only">(opens in new tab)</span>
      </Link>
    </nav>
  );
}

/**
 * Mobile Creator Navigation
 *
 * Horizontal scrolling navigation for mobile devices.
 * Note: Mobile nav doesn't show the profile link to save space.
 */
export function CreatorNavMobile() {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide"
      role="navigation"
      aria-label="Creator navigation"
    >
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/creator/dashboard" &&
            pathname.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors min-h-[44px]",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="size-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
