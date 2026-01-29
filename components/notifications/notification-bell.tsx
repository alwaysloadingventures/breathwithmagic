"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NotificationDropdown } from "./notification-dropdown";
import type { NotificationItemData } from "./notification-item";

interface NotificationBellProps {
  /** Custom class name for the button */
  className?: string;
}

/**
 * NotificationBell - Bell icon with unread badge and dropdown
 *
 * Features:
 * - Bell icon with unread count badge (red dot or number)
 * - Polling every 30 seconds for unread count
 * - Click opens dropdown with recent notifications
 * - 44px minimum touch targets
 */
export function NotificationBell({ className }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItemData[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch unread count from API
   */
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/unread-count");
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      // Silently fail for polling - don't show errors for background updates
      console.error("Failed to fetch notification count:", err);
    }
  }, []);

  /**
   * Fetch notifications from API
   */
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/notifications?limit=5");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.items);
        setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });

      if (response.ok) {
        // Update local state
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  }, []);

  /**
   * Mark a single notification as read
   */
  const markAsRead = useCallback(async (id: string) => {
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
   * Handle dropdown open state changes
   */
  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (open) {
        // Fetch fresh notifications when opening
        fetchNotifications();
      }
    },
    [fetchNotifications],
  );

  // Initial fetch of unread count on mount
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Set up polling for unread count (every 30 seconds)
  useEffect(() => {
    pollingIntervalRef.current = setInterval(fetchUnreadCount, 30000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [fetchUnreadCount]);

  const triggerButton = (
    <Button
      variant="ghost"
      size="icon"
      className={cn("relative min-w-[44px] min-h-[44px] w-11 h-11", className)}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <Bell className="w-5 h-5" aria-hidden="true" />

      {/* Unread badge */}
      {unreadCount > 0 && (
        <span
          className={cn(
            "absolute flex items-center justify-center",
            "bg-destructive text-destructive-foreground",
            "font-medium rounded-full",
            "ring-2 ring-background",
            unreadCount > 9
              ? "top-0.5 right-0.5 h-5 min-w-5 px-1 text-[10px]"
              : unreadCount > 0
                ? "top-1 right-1 h-4 w-4 text-[10px]"
                : "top-1.5 right-1.5 h-2 w-2",
          )}
          aria-hidden="true"
        >
          {unreadCount > 99 ? "99+" : unreadCount > 0 ? unreadCount : ""}
        </span>
      )}
    </Button>
  );

  return (
    <NotificationDropdown
      trigger={triggerButton}
      notifications={notifications}
      isLoading={isLoading}
      onMarkAllAsRead={markAllAsRead}
      onMarkAsRead={markAsRead}
      open={isOpen}
      onOpenChange={handleOpenChange}
    />
  );
}
