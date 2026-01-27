"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import {
  type CreatorCategory,
  type SubscriptionPriceTier,
  categoryInfo,
  priceTierToAmount,
} from "@/lib/validations/creator";

interface StepCategoryPricingProps {
  category: CreatorCategory | null;
  subscriptionPrice: SubscriptionPriceTier;
  trialEnabled: boolean;
  onCategoryChange: (category: CreatorCategory) => void;
  onPriceChange: (price: SubscriptionPriceTier) => void;
  onTrialChange: (enabled: boolean) => void;
  onNext: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

const categories: CreatorCategory[] = [
  "Breathwork",
  "Yoga",
  "Meditation",
  "Mindfulness",
  "Somatic",
  "SoundHealing",
  "Movement",
  "Coaching",
  "Sleep",
  "StressRelief",
];

const priceTiers: SubscriptionPriceTier[] = [
  "TIER_500",
  "TIER_1000",
  "TIER_2000",
  "TIER_3000",
];

/**
 * Step 3: Category & Pricing
 *
 * User selects their primary category and sets subscription pricing.
 * Includes trial toggle option.
 */
export function StepCategoryPricing({
  category,
  subscriptionPrice,
  trialEnabled,
  onCategoryChange,
  onPriceChange,
  onTrialChange,
  onNext,
  onBack,
  isLoading = false,
}: StepCategoryPricingProps) {
  const canProceed = category !== null;

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Category & Pricing
        </h2>
        <p className="text-muted-foreground">
          Choose your primary focus and set your monthly subscription price.
        </p>
      </div>

      {/* Category Selection */}
      <div className="space-y-4">
        <Label className="text-base">Primary Category</Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {categories.map((cat) => {
            const info = categoryInfo[cat];
            const isSelected = category === cat;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => onCategoryChange(cat)}
                className={cn(
                  "flex min-h-[72px] flex-col items-start justify-center rounded-xl border p-4 text-left transition-all",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  "hover:border-primary/50 hover:bg-accent/30",
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-background",
                )}
                aria-pressed={isSelected}
              >
                <span className="font-medium">{info.label}</span>
                <span className="mt-0.5 text-xs text-muted-foreground">
                  {info.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Selection */}
      <div className="space-y-4">
        <Label className="text-base">Monthly Subscription Price</Label>
        <div className="grid grid-cols-4 gap-3">
          {priceTiers.map((tier) => {
            const amount = priceTierToAmount[tier];
            const isSelected = subscriptionPrice === tier;

            return (
              <button
                key={tier}
                type="button"
                onClick={() => onPriceChange(tier)}
                className={cn(
                  "flex h-16 flex-col items-center justify-center rounded-xl border transition-all",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  "hover:border-primary/50 hover:bg-accent/30",
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-background",
                )}
                aria-pressed={isSelected}
              >
                <span className="text-lg font-semibold">${amount}</span>
                <span className="text-xs text-muted-foreground">/month</span>
              </button>
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground">
          You can change your price anytime. Existing subscribers keep their
          original rate.
        </p>
        <p className="text-sm text-primary/80">
          Most new creators start at $10/month — it&apos;s a sweet spot for
          building an audience while valuing your work.
        </p>
      </div>

      {/* Trial Toggle */}
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-border bg-background p-4">
          <div className="space-y-0.5">
            <Label htmlFor="trial-toggle" className="text-base font-medium">
              Offer 7-day free trial
            </Label>
            <p className="text-sm text-muted-foreground">
              Let new subscribers try before they buy
            </p>
          </div>
          <Switch
            id="trial-toggle"
            checked={trialEnabled}
            onCheckedChange={onTrialChange}
          />
        </div>
        <p className="text-sm text-primary/80">
          Creators with trials enabled see up to 40% more subscriptions. You can
          turn this off anytime in settings.
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
          className="h-12 flex-1 text-base"
        >
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed || isLoading}
          className="h-12 flex-1 text-base"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Please wait...
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    </div>
  );
}
