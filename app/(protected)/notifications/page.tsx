import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Bell } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensure-user";
import { Button } from "@/components/ui/button";
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
  // Ensure user exists in database (auto-creates if not)
  const userResult = await ensureUser();
  if (!userResult) {
    redirect("/sign-in?redirect_url=/notifications");
  }
  const dbUser = userResult.user;

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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8 flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
        {unreadCount > 0 && (
          <span className="text-sm text-muted-foreground">
            ({unreadCount} unread)
          </span>
        )}
      </div>

      {/* Content */}
      {formattedNotifications.length === 0 ? (
        <EmptyState />
      ) : (
        <NotificationsClient
          initialNotifications={formattedNotifications}
          initialCursor={nextCursor}
          initialUnreadCount={unreadCount}
        />
      )}
    </div>
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
