"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Mail, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Navigation items for the mobile bottom nav
 */
const navItems = [
  {
    label: "Home",
    href: "/home",
    icon: Home,
  },
  {
    label: "Explore",
    href: "/explore",
    icon: Compass,
  },
  {
    label: "Messages",
    href: "/messages",
    icon: Mail,
  },
  {
    label: "Alerts",
    href: "/notifications",
    icon: Bell,
  },
  {
    label: "Profile",
    href: "/settings",
    icon: User,
  },
];

/**
 * MobileNav - Bottom navigation bar for mobile devices
 *
 * Features:
 * - Fixed bottom navigation visible only on mobile (md and below)
 * - 44px minimum touch targets for all buttons
 * - Active state indicator
 * - Safe area inset padding for notched phones
 * - Smooth transitions
 */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-border bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80"
      role="navigation"
      aria-label="Mobile navigation"
    >
      {/* Safe area padding for notched phones */}
      <div className="pb-safe-area-inset-bottom">
        <div className="flex items-center justify-around px-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 min-h-[56px] min-w-[56px] px-3 py-2 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground active:text-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    "size-6 transition-transform",
                    isActive && "scale-110"
                  )}
                  aria-hidden="true"
                />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

/**
 * MobileNavSpacer - Spacer component to prevent content from being hidden behind mobile nav
 *
 * Add this to the bottom of page layouts that use MobileNav
 */
export function MobileNavSpacer() {
  return (
    <div
      className="h-[72px] md:hidden pb-safe-area-inset-bottom"
      aria-hidden="true"
    />
  );
}
