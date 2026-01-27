"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, CheckCircle } from "lucide-react";
import {
  type CreatorCategory,
  type SubscriptionPriceTier,
  categoryInfo,
  priceTierToAmount,
} from "@/lib/validations/creator";

interface StepPreviewProps {
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  category: CreatorCategory;
  subscriptionPrice: SubscriptionPriceTier;
  trialEnabled: boolean;
  onBack: () => void;
  onActivate: () => Promise<void>;
}

/**
 * Step 4: Preview & Confirm
 *
 * Shows a preview of how the creator profile will appear.
 * Allows the user to go back and make changes or activate their profile.
 */
export function StepPreview({
  handle,
  displayName,
  bio,
  avatarUrl,
  category,
  subscriptionPrice,
  trialEnabled,
  onBack,
  onActivate,
}: StepPreviewProps) {
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceAmount = priceTierToAmount[subscriptionPrice];
  const categoryLabel = categoryInfo[category].label;

  // Get initials for avatar fallback
  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleActivate = async () => {
    setIsActivating(true);
    setError(null);

    try {
      await onActivate();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to activate profile",
      );
      setIsActivating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Preview your profile
        </h2>
        <p className="text-muted-foreground">
          Here is how your page will look to subscribers.
        </p>
      </div>

      {/* Profile Preview Card */}
      <Card className="overflow-hidden">
        {/* Cover area placeholder */}
        <div className="h-24 bg-gradient-to-r from-primary/20 to-accent" />

        <CardHeader className="relative -mt-12 pb-2">
          <div className="flex flex-col items-center sm:flex-row sm:items-end sm:gap-4">
            <Avatar className="size-20 border-4 border-background shadow-md">
              <AvatarImage src={avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="text-xl">
                {displayName ? (
                  getInitials(displayName)
                ) : (
                  <User className="size-8" />
                )}
              </AvatarFallback>
            </Avatar>

            <div className="mt-3 text-center sm:mt-0 sm:text-left">
              <CardTitle className="text-xl">{displayName}</CardTitle>
              <CardDescription className="flex items-center justify-center gap-2 sm:justify-start">
                <span>@{handle}</span>
                <span className="text-border">•</span>
                <Badge variant="secondary" className="text-xs">
                  {categoryLabel}
                </Badge>
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Bio */}
          {bio ? (
            <p className="text-sm text-muted-foreground">{bio}</p>
          ) : (
            <p className="text-sm italic text-muted-foreground/60">
              No bio yet - you can add one later in settings
            </p>
          )}

          {/* Subscription info */}
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  Subscribe for ${priceAmount}/month
                </p>
                {trialEnabled && (
                  <p className="text-sm text-muted-foreground">
                    7-day free trial included
                  </p>
                )}
              </div>
              <Button size="sm" disabled className="pointer-events-none">
                Subscribe
              </Button>
            </div>
          </div>

          {/* Profile URL */}
          <div className="rounded-lg bg-accent/50 p-3 text-center">
            <p className="text-sm text-muted-foreground">Your profile URL</p>
            <p className="font-medium text-primary">
              breathwithmagic.com/{handle}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Profile checklist</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle className="size-4 text-green-500" />
            Handle selected: @{handle}
          </li>
          <li className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle className="size-4 text-green-500" />
            Display name set: {displayName}
          </li>
          <li className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle className="size-4 text-green-500" />
            Category: {categoryLabel}
          </li>
          <li className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle className="size-4 text-green-500" />
            Price: ${priceAmount}/month
            {trialEnabled && " (with trial)"}
          </li>
        </ul>
      </div>

      {/* What happens next */}
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <h3 className="font-medium">What happens next?</h3>
        <ol className="mt-2 space-y-1.5 text-sm text-muted-foreground list-decimal list-inside">
          <li>Your profile will be created in draft mode</li>
          <li>
            <span className="font-medium text-foreground">Set up Stripe</span>{" "}
            to receive payments (required to publish)
          </li>
          <li>Once Stripe is connected, your profile goes live</li>
        </ol>
      </div>

      {error && (
        <div
          className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isActivating}
          className="h-12 flex-1 text-base"
        >
          Back
        </Button>
        <Button
          onClick={handleActivate}
          disabled={isActivating}
          className="h-12 flex-1 text-base"
        >
          {isActivating ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Creating profile...
            </>
          ) : (
            "Create Profile"
          )}
        </Button>
      </div>
    </div>
  );
}
