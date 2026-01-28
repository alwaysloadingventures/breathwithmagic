"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, Check, Loader2, UserMinus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CreatorProfileActionsProps {
  creatorId: string;
  creatorHandle: string;
  price: string;
  trialEnabled: boolean;
  isAuthenticated: boolean;
  isSubscribed: boolean;
  isFollowing: boolean;
}

/**
 * CreatorProfileActions - Client component for follow/subscribe buttons
 *
 * Handles interactive actions on creator profile pages.
 * Shows clear distinction between following (free content) and subscribing (all content).
 */
export function CreatorProfileActions({
  creatorId,
  creatorHandle,
  price,
  trialEnabled,
  isAuthenticated,
  isSubscribed: initialIsSubscribed,
  isFollowing: initialIsFollowing,
}: CreatorProfileActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isHoveringFollow, setIsHoveringFollow] = useState(false);

  /**
   * Handle follow/unfollow toggle
   */
  const handleFollowToggle = useCallback(async () => {
    if (!isAuthenticated) {
      // Redirect to sign in
      router.push(`/sign-in?redirect_url=/${creatorHandle}`);
      return;
    }

    setIsFollowLoading(true);

    try {
      const response = await fetch(`/api/creators/${creatorId}/follow`, {
        method: isFollowing ? "DELETE" : "POST",
      });

      if (response.ok) {
        setIsFollowing(!isFollowing);
        startTransition(() => {
          router.refresh();
        });
      } else {
        const data = await response.json();
        console.error("Follow error:", data.error);
      }
    } catch (error) {
      console.error("Follow error:", error);
    } finally {
      setIsFollowLoading(false);
    }
  }, [isAuthenticated, isFollowing, creatorId, creatorHandle, router]);

  /**
   * Handle subscribe click
   */
  const handleSubscribe = useCallback(() => {
    if (!isAuthenticated) {
      // Redirect to sign up with return URL
      router.push(`/sign-up?redirect_url=/${creatorHandle}`);
      return;
    }

    // Set loading state and navigate to subscribe endpoint
    setIsSubscribing(true);
    router.push(`/api/creators/${creatorId}/subscribe`);
  }, [isAuthenticated, creatorId, creatorHandle, router]);

  return (
    <div className="flex items-center gap-3">
      {/* Follow Button - Only show if not subscribed (subscribers are implicitly following) */}
      {!initialIsSubscribed && (
        <Button
          variant="outline"
          onClick={handleFollowToggle}
          disabled={isFollowLoading || isPending}
          onMouseEnter={() => setIsHoveringFollow(true)}
          onMouseLeave={() => setIsHoveringFollow(false)}
          className={cn(
            "min-h-[44px] min-w-[110px] transition-all duration-150",
            isFollowing
              ? "border-primary/50 text-primary hover:border-destructive hover:text-destructive hover:bg-destructive/5"
              : "border-border hover:border-primary/50 hover:text-primary",
          )}
          aria-label={isFollowing ? "Unfollow" : "Follow"}
          title={
            isFollowing
              ? "Click to unfollow"
              : "Follow to see free content in your feed"
          }
        >
          {isFollowLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isFollowing && isHoveringFollow ? (
            <>
              <UserMinus className="size-4 mr-1.5" />
              Unfollow
            </>
          ) : isFollowing ? (
            <>
              <Check className="size-4 mr-1.5" />
              Following
            </>
          ) : (
            <>
              <Heart className="size-4 mr-1.5" />
              Follow
            </>
          )}
        </Button>
      )}

      {/* Subscribe Button */}
      {!initialIsSubscribed && (
        <Button
          onClick={handleSubscribe}
          className="min-h-[44px] min-w-[160px] flex flex-col items-center justify-center leading-tight"
          disabled={isPending || isSubscribing}
          title="Subscribe to unlock all exclusive content"
        >
          {isSubscribing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : trialEnabled ? (
            <>
              <span>Start 7-day trial</span>
              <span className="text-xs opacity-80 font-normal">
                then {price}/month
              </span>
            </>
          ) : (
            `Subscribe ${price}/mo`
          )}
        </Button>
      )}

      {/* Subscribed Badge */}
      {initialIsSubscribed && (
        <Button
          variant="outline"
          disabled
          className="min-h-[44px] gap-2 border-primary/50 text-primary"
          title="You have full access to all content"
        >
          <Check className="size-4" />
          Subscribed
        </Button>
      )}
    </div>
  );
}
