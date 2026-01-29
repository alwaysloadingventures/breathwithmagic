"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  NotificationItem,
  type NotificationItemData,
} from "@/components/notifications/notification-item";

interface NotificationsClientProps {
  initialNotifications: NotificationItemData[];
  initialCursor: string | null;
  initialUnreadCount: number;
}

/**
 * NotificationsClient - Client component for the notifications page
 *
 * Features:
 * - Infinite scroll / "Load more" pagination
 * - Mark as read on view
 * - Mark all as read button
 * - Loading states
 * - Error handling
 */
export function NotificationsClient({
  initialNotifications,
  initialCursor,
  initialUnreadCount,
}: NotificationsClientProps) {
  const [notifications, setNotifications] =
    useState<NotificationItemData[]>(initialNotifications);
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track which notifications have been viewed (for auto-marking as read)
  const viewedNotificationsRef = useRef<Set<string>>(new Set());

  /**
   * Fetch more notifications
   */
  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/notifications?cursor=${nextCursor}&limit=20`,
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to load notifications");
      }

      const data = await response.json();

      setNotifications((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load notifications",
      );
    } finally {
      setIsLoading(false);
    }
  }, [nextCursor, isLoading]);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    if (isMarkingAll) return;

    setIsMarkingAll(true);

    try {
      const response = await fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to mark notifications");
      }

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to mark notifications",
      );
    } finally {
      setIsMarkingAll(false);
    }
  }, [isMarkingAll]);

  /**
   * Mark a single notification as read
   */
  const markAsRead = useCallback(async (id: string) => {
    // Skip if already viewed
    if (viewedNotificationsRef.current.has(id)) return;
    viewedNotificationsRef.current.add(id);

    try {
      const response = await fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: [id] }),
      });

      if (response.ok) {
        // Update local state
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }, []);

  /**
   * Auto-mark unread notifications as read when they become visible
   * Uses Intersection Observer for efficient visibility detection
   */
  useEffect(() => {
    const unreadNotifications = notifications.filter((n) => !n.isRead);
    if (unreadNotifications.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-notification-id");
            if (id && !viewedNotificationsRef.current.has(id)) {
              // Mark as read after a short delay (user has viewed it)
              setTimeout(() => {
                const notification = notifications.find((n) => n.id === id);
                if (notification && !notification.isRead) {
                  markAsRead(id);
                }
              }, 1000);
            }
          }
        });
      },
      { threshold: 0.5 },
    );

    // Observe unread notification elements
    const elements = document.querySelectorAll("[data-notification-id]");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [notifications, markAsRead]);

  const hasUnread = unreadCount > 0;

  return (
    <div className="space-y-6">
      {/* Header with Mark All Read button */}
      {hasUnread && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            disabled={isMarkingAll}
            className="min-h-[44px]"
          >
            {isMarkingAll ? (
              <>
                <Loader2
                  className="w-4 h-4 mr-2 animate-spin"
                  aria-hidden="true"
                />
                Marking...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" aria-hidden="true" />
                Mark all as read
              </>
            )}
          </Button>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div
          className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Notifications list */}
      <div className="space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            data-notification-id={notification.id}
            className="border border-border rounded-lg overflow-hidden bg-card"
          >
            <NotificationItem
              notification={notification}
              onMarkAsRead={markAsRead}
              showFullBody
            />
          </div>
        ))}
      </div>

      {/* Load more button */}
      {nextCursor && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isLoading}
            className="min-h-[44px] min-w-[120px]"
          >
            {isLoading ? (
              <>
                <Loader2
                  className="w-4 h-4 mr-2 animate-spin"
                  aria-hidden="true"
                />
                Loading...
              </>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}

      {/* End of list message */}
      {!nextCursor && notifications.length > 0 && (
        <p className="text-center text-sm text-muted-foreground pt-4">
          You&apos;ve seen all your notifications
        </p>
      )}
    </div>
  );
}
