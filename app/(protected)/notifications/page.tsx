import { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Bell } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { SkipLink } from "@/components/ui/skip-link";
import { NotificationsClient } from "./notifications-client";

export const metadata: Metadata = {
  title: "Notifications | breathwithmagic",
  description: "Your notifications on breathwithmagic",
};

/**
 * NotificationsPage - Server component for the full notification inbox
 *
 * Features:
 * - Full notification inbox
 * - Server-side initial data fetch
 * - Client-side infinite scroll
 */
export default async function NotificationsPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in?redirect_url=/notifications");
  }

  // Get the user from our database
  const dbUser = await prisma.user.findUnique({
    where: { clerkId: user.id },
    select: { id: true },
  });

  if (!dbUser) {
    redirect("/sign-in");
  }

  // Fetch initial notifications
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({
      where: {
        userId: dbUser.id,
        isRead: false,
      },
    }),
  ]);

  // Format notifications for the client
  const formattedNotifications = notifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    link: notification.link,
    isRead: notification.isRead,
    createdAt: notification.createdAt.toISOString(),
  }));

  // Determine if there are more notifications
  const hasMore = notifications.length === 20;
  const nextCursor = hasMore
    ? notifications[notifications.length - 1]?.id
    : null;

  return (
    <>
      <SkipLink />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Link
                  href="/home"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Back to home"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5"
                    aria-hidden="true"
                  >
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                </Link>
                <h1 className="text-lg font-semibold text-foreground">
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <span className="text-sm text-muted-foreground">
                    ({unreadCount} unread)
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main
          id="main-content"
          className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        >
          {formattedNotifications.length === 0 ? (
            <EmptyState />
          ) : (
            <NotificationsClient
              initialNotifications={formattedNotifications}
              initialCursor={nextCursor}
              initialUnreadCount={unreadCount}
            />
          )}
        </main>
      </div>
    </>
  );
}

/**
 * EmptyState - Shown when user has no notifications
 */
function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
        <Bell className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        No notifications yet
      </h2>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        When creators you follow post new content or when there are updates
        about your subscriptions, you&apos;ll see them here.
      </p>
      <Link href="/explore">
        <Button>Explore creators</Button>
      </Link>
    </div>
  );
}
