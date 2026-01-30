"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  Menu,
  Home,
  Compass,
  Heart,
  Users,
  Mail,
  Settings,
  User,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/lib/button-variants";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { NotificationBell } from "@/components/notifications";

/**
 * Main navigation items
 */
const mainNavItems = [
  { label: "Feed", href: "/home", icon: Home },
  { label: "Explore", href: "/explore", icon: Compass },
  { label: "Following", href: "/following", icon: Heart },
  { label: "Subscriptions", href: "/subscriptions", icon: Users },
  { label: "Messages", href: "/messages", icon: Mail },
];

/**
 * Secondary navigation items (settings, etc.)
 */
const secondaryNavItems = [
  { label: "Settings", href: "/settings", icon: Settings },
];

interface HeaderProps {
  /** Whether the user is a creator (shows creator dashboard link) */
  isCreator?: boolean;
  /** User's first name for personalization */
  userName?: string;
}

/**
 * Header - Responsive header with mobile hamburger menu
 *
 * Features:
 * - Desktop: Full navigation bar with links
 * - Mobile: Hamburger menu with slide-out drawer
 * - Notification bell always visible
 * - User avatar always visible
 * - 44px minimum touch targets
 */
export function Header({ isCreator = false, userName }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/home" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 text-primary"
                aria-hidden="true"
              >
                <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" />
                <path d="M17 4a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2" />
              </svg>
            </div>
            <span className="font-semibold text-foreground hidden sm:inline">
              breathwithmagic
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {mainNavItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "min-h-[44px]",
                    isActive && "text-primary bg-primary/5"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="size-4 mr-1" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}

            {/* Creator Dashboard Link - Only visible for creators */}
            {isCreator && (
              <>
                <div className="mx-1 h-6 w-px bg-border" role="separator" aria-hidden="true" />
                <Link
                  href="/creator/dashboard"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "min-h-[44px] text-primary hover:bg-primary/10",
                    pathname.startsWith("/creator") && "bg-primary/5"
                  )}
                  aria-current={pathname.startsWith("/creator") ? "page" : undefined}
                >
                  <LayoutDashboard className="size-4 mr-1" aria-hidden="true" />
                  Creator Studio
                </Link>
              </>
            )}
          </nav>

          {/* Right side: Notifications, Settings, User Menu */}
          <div className="flex items-center gap-2">
            <NotificationBell />

            <Link
              href="/settings"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "hidden md:flex min-h-[44px] min-w-[44px]"
              )}
              aria-label="Settings"
            >
              <Settings className="size-5" />
            </Link>

            {/* Mobile Hamburger Menu */}
            <Sheet>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden min-h-[44px] min-w-[44px]"
                    aria-label="Open menu"
                  />
                }
              >
                <Menu className="size-5" />
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[320px]">
                <SheetHeader className="text-left">
                  <SheetTitle>
                    {userName ? `Hi, ${userName}` : "Menu"}
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-1" aria-label="Mobile navigation">
                  {/* Main Navigation */}
                  {mainNavItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;

                    return (
                      <SheetClose
                        key={item.href}
                        render={
                          <Link
                            href={item.href}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[48px]",
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                            aria-current={isActive ? "page" : undefined}
                          />
                        }
                      >
                        <Icon className="size-5" aria-hidden="true" />
                        {item.label}
                      </SheetClose>
                    );
                  })}

                  {/* Divider */}
                  <div className="my-3 h-px bg-border" role="separator" />

                  {/* Secondary Navigation */}
                  {secondaryNavItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                      <SheetClose
                        key={item.href}
                        render={
                          <Link
                            href={item.href}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[48px]",
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                            aria-current={isActive ? "page" : undefined}
                          />
                        }
                      >
                        <Icon className="size-5" aria-hidden="true" />
                        {item.label}
                      </SheetClose>
                    );
                  })}

                  {/* Creator Studio Link */}
                  {isCreator && (
                    <>
                      <div className="my-3 h-px bg-border" role="separator" />
                      <SheetClose
                        render={
                          <Link
                            href="/creator/dashboard"
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[48px]",
                              pathname.startsWith("/creator")
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                            aria-current={pathname.startsWith("/creator") ? "page" : undefined}
                          />
                        }
                      >
                        <LayoutDashboard className="size-5" aria-hidden="true" />
                        Creator Studio
                      </SheetClose>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>

            {/* User Button */}
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10",
                },
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * PublicHeader - Header for public pages (not logged in)
 *
 * Shows sign in/sign up buttons instead of user menu
 */
export function PublicHeader() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      {/* Skip link for keyboard accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        Skip to main content
      </a>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 text-primary"
                aria-hidden="true"
              >
                <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" />
                <path d="M17 4a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2" />
              </svg>
            </div>
            <span className="font-semibold text-foreground">breathwithmagic</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            <Link
              href="/explore"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "min-h-[44px]")}
            >
              <Compass className="size-4 mr-1" aria-hidden="true" />
              Explore
            </Link>
            <Link
              href="/become-creator"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "min-h-[44px]")}
            >
              <User className="size-4 mr-1" aria-hidden="true" />
              Become a Creator
            </Link>
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "min-h-[44px]"
              )}
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "min-h-[44px]"
              )}
            >
              Get started
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
