"use client";

import { useState, useCallback, type ReactElement } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  NotificationItem,
  type NotificationItemData,
} from "./notification-item";

interface NotificationDropdownProps {
  /** The trigger element (notification bell) - must be a single React element */
  trigger: ReactElement;
  /** Initial notifications to show */
  notifications: NotificationItemData[];
  /** Whether notifications are loading */
  isLoading?: boolean;
  /** Callback when "Mark all as read" is clicked */
  onMarkAllAsRead?: () => Promise<void>;
  /** Callback when a single notification is marked as read */
  onMarkAsRead?: (id: string) => Promise<void>;
  /** Whether the dropdown is open (controlled) */
  open?: boolean;
  /** Callback when dropdown open state changes */
  onOpenChange?: (open: boolean) => void;
}

/**
 * NotificationDropdown - Dropdown showing recent notifications
 *
 * Features:
 * - Shows last 5 notifications
 * - "Mark all as read" button
 * - "View all" link to /notifications page
 * - Loading state with skeletons
 * - Empty state message
 */
export function NotificationDropdown({
  trigger,
  notifications,
  isLoading = false,
  onMarkAllAsRead,
  onMarkAsRead,
  open,
  onOpenChange,
}: NotificationDropdownProps) {
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const hasUnread = notifications.some((n) => !n.isRead);
  const displayNotifications = notifications.slice(0, 5);

  const handleMarkAllAsRead = useCallback(async () => {
    if (!onMarkAllAsRead || isMarkingAll) return;

    setIsMarkingAll(true);
    try {
      await onMarkAllAsRead();
    } finally {
      setIsMarkingAll(false);
    }
  }, [onMarkAllAsRead, isMarkingAll]);

  const handleMarkAsRead = useCallback(
    async (id: string) => {
      if (onMarkAsRead) {
        await onMarkAsRead(id);
      }
    },
    [onMarkAsRead],
  );

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent
        align="end"
        className="w-[360px] max-w-[min(90vw,360px)] p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground">Notifications</h3>
          {hasUnread && onMarkAllAsRead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll}
              className="text-xs h-8 px-2"
            >
              <Check className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
              {isMarkingAll ? "Marking..." : "Mark all read"}
            </Button>
          )}
        </div>

        {/* Notification List */}
        <div className="max-h-[320px] overflow-y-auto">
          {isLoading ? (
            // Loading skeletons
            <div className="p-2 space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3">
                  <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayNotifications.length === 0 ? (
            // Empty state
            <div className="py-8 px-4 text-center">
              <p className="text-sm text-muted-foreground">
                No notifications yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                We&apos;ll let you know when something happens
              </p>
            </div>
          ) : (
            // Notification items
            <div className="p-2 space-y-1">
              {displayNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {displayNotifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Link
                href="/notifications"
                className="block w-full text-center py-2 text-sm text-primary hover:text-primary/80 transition-colors rounded-md hover:bg-muted/50"
              >
                View all notifications
              </Link>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
