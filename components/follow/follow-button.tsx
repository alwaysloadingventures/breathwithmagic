"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, Check, Loader2, UserMinus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FollowButtonProps {
  /** Creator's ID */
  creatorId: string;
  /** Creator's handle for redirect */
  creatorHandle: string;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Initial following state */
  isFollowing: boolean;
  /** Size variant */
  size?: "default" | "sm" | "lg";
  /** Whether to show text label */
  showLabel?: boolean;
  /** Custom className */
  className?: string;
  /** Callback after follow/unfollow action */
  onFollowChange?: (isFollowing: boolean) => void;
}

/**
 * FollowButton - Reusable follow/unfollow button with optimistic updates
 *
 * Features:
 * - Optimistic UI updates
 * - Hover state shows "Unfollow" when following
 * - Redirects to sign-in if not authenticated
 * - 44px minimum touch target
 */
export function FollowButton({
  creatorId,
  creatorHandle,
  isAuthenticated,
  isFollowing: initialIsFollowing,
  size = "default",
  showLabel = true,
  className,
  onFollowChange,
}: FollowButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  /**
   * Handle follow/unfollow toggle
   */
  const handleToggle = useCallback(async () => {
    if (!isAuthenticated) {
      // Redirect to sign in
      router.push(`/sign-in?redirect_url=/${creatorHandle}`);
      return;
    }

    setIsLoading(true);
    const previousState = isFollowing;

    // Optimistic update
    setIsFollowing(!isFollowing);

    try {
      const response = await fetch(`/api/creators/${creatorId}/follow`, {
        method: isFollowing ? "DELETE" : "POST",
      });

      if (response.ok) {
        // Trigger callback if provided
        onFollowChange?.(!previousState);

        // Refresh the page to sync server state
        startTransition(() => {
          router.refresh();
        });
      } else {
        // Revert on error
        setIsFollowing(previousState);
        const data = await response.json();
        console.error("Follow error:", data.error);
      }
    } catch (error) {
      // Revert on error
      setIsFollowing(previousState);
      console.error("Follow error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    isAuthenticated,
    isFollowing,
    creatorId,
    creatorHandle,
    router,
    onFollowChange,
  ]);

  const isDisabled = isLoading || isPending;

  // Determine button content based on state
  const getButtonContent = () => {
    if (isLoading) {
      return <Loader2 className="size-4 animate-spin" />;
    }

    if (isFollowing && isHovering) {
      return showLabel ? (
        <>
          <UserMinus className="size-4 mr-1.5" />
          Unfollow
        </>
      ) : (
        <UserMinus className="size-4" />
      );
    }

    if (isFollowing) {
      return showLabel ? (
        <>
          <Check className="size-4 mr-1.5" />
          Following
        </>
      ) : (
        <Heart className="size-4 fill-current" />
      );
    }

    return showLabel ? (
      <>
        <Heart className="size-4 mr-1.5" />
        Follow
      </>
    ) : (
      <Heart className="size-4" />
    );
  };

  const sizeClasses = {
    sm: "min-h-[36px] min-w-[90px]",
    default: "min-h-[44px] min-w-[110px]",
    lg: "min-h-[52px] min-w-[130px]",
  };

  return (
    <Button
      variant="outline"
      size={size}
      onClick={handleToggle}
      disabled={isDisabled}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={cn(
        sizeClasses[size],
        "transition-all duration-150",
        isFollowing
          ? "border-primary/50 text-primary hover:border-destructive hover:text-destructive hover:bg-destructive/5"
          : "border-border hover:border-primary/50 hover:text-primary",
        className,
      )}
      aria-label={isFollowing ? "Unfollow" : "Follow"}
      title={
        isFollowing
          ? "Click to unfollow"
          : "Follow to see free content in your feed"
      }
    >
      {getButtonContent()}
    </Button>
  );
}
