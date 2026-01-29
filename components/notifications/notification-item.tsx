"use client";

import Link from "next/link";
import {
  Play,
  MessageCircle,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotificationType } from "@prisma/client";

/**
 * Notification item data type
 */
export interface NotificationItemData {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationItemProps {
  notification: NotificationItemData;
  onMarkAsRead?: (id: string) => void;
  showFullBody?: boolean;
}

/**
 * Get icon color class for notification type
 */
function getIconColorClass(type: NotificationType): string {
  switch (type) {
    case "new_content":
      return "text-primary";
    case "new_message":
      return "text-primary";
    case "subscription_renewed":
      return "text-green-600 dark:text-green-500";
    case "trial_ending":
      return "text-amber-600 dark:text-amber-500";
    case "payment_failed":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}

/**
 * NotificationIcon - Renders the appropriate icon for the notification type
 */
function NotificationIcon({
  type,
  className,
}: {
  type: NotificationType;
  className?: string;
}) {
  const colorClass = getIconColorClass(type);
  const combinedClassName = cn("w-5 h-5", colorClass, className);

  switch (type) {
    case "new_content":
      return <Play className={combinedClassName} />;
    case "new_message":
      return <MessageCircle className={combinedClassName} />;
    case "subscription_renewed":
      return <CheckCircle className={combinedClassName} />;
    case "trial_ending":
      return <Clock className={combinedClassName} />;
    case "payment_failed":
      return <AlertCircle className={combinedClassName} />;
    default:
      return <MessageCircle className={combinedClassName} />;
  }
}

/**
 * Format relative time for notifications
 */
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return "Just now";
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Truncate text to a maximum length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength).trim() + "...";
}

/**
 * NotificationItem - A single notification display component
 *
 * Features:
 * - Icon based on notification type
 * - Title, body preview (truncated)
 * - Time ago display
 * - Unread indicator (background highlight)
 * - Click navigates to link and marks as read
 * - 44px minimum touch targets
 */
export function NotificationItem({
  notification,
  onMarkAsRead,
  showFullBody = false,
}: NotificationItemProps) {
  const handleClick = () => {
    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  };

  const content = (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg transition-colors min-h-[44px]",
        "hover:bg-muted/50 cursor-pointer",
        !notification.isRead && "bg-accent/30",
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`${notification.isRead ? "" : "Unread "}notification: ${notification.title}`}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
          "bg-muted",
        )}
        aria-hidden="true"
      >
        <NotificationIcon type={notification.type} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm font-medium text-foreground",
              !notification.isRead && "font-semibold",
            )}
          >
            {notification.title}
          </p>
          {/* Unread indicator dot */}
          {!notification.isRead && (
            <span
              className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-primary"
              aria-label="Unread"
            />
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {showFullBody
            ? notification.body
            : truncateText(notification.body, 80)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatTimeAgo(notification.createdAt)}
        </p>
      </div>
    </div>
  );

  // Wrap in Link if there's a link
  if (notification.link) {
    return (
      <Link href={notification.link} className="block" onClick={handleClick}>
        {content}
      </Link>
    );
  }

  return content;
}
