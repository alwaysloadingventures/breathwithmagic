"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Save, CheckCircle } from "lucide-react";
import {
  categoryInfo,
  type CreatorCategory,
  type SubscriptionPriceTier,
} from "@/lib/validations/creator";

interface CreatorSettings {
  id: string;
  handle: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  category: CreatorCategory;
  subscriptionPrice: SubscriptionPriceTier;
  trialEnabled: boolean;
  dmEnabled: boolean;
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean;
  status: string;
  isVerified: boolean;
  isFeatured: boolean;
}

interface SettingsClientProps {
  initialSettings: CreatorSettings;
}

/**
 * Settings Client Component
 *
 * Client component for editing creator settings.
 */
export function SettingsClient({ initialSettings }: SettingsClientProps) {
  const router = useRouter();

  // Form state
  const [displayName, setDisplayName] = useState(initialSettings.displayName);
  const [bio, setBio] = useState(initialSettings.bio || "");
  const [category, setCategory] = useState<CreatorCategory>(
    initialSettings.category,
  );
  const [subscriptionPrice, setSubscriptionPrice] =
    useState<SubscriptionPriceTier>(initialSettings.subscriptionPrice);
  const [trialEnabled, setTrialEnabled] = useState(
    initialSettings.trialEnabled,
  );
  const [dmEnabled, setDmEnabled] = useState(initialSettings.dmEnabled);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/creator/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          bio: bio || null,
          category,
          subscriptionPrice,
          trialEnabled,
          dmEnabled,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      setSuccess(true);
      router.refresh();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving settings:", err);
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Category options
  const categories = Object.entries(categoryInfo).map(([key, value]) => ({
    value: key as CreatorCategory,
    label: value.label,
    description: value.description,
  }));

  // Price tier options
  const priceTiers: { value: SubscriptionPriceTier; label: string }[] = [
    { value: "TIER_FREE", label: "Free" },
    { value: "TIER_500", label: "$5/month" },
    { value: "TIER_1000", label: "$10/month" },
    { value: "TIER_1500", label: "$15/month" },
    { value: "TIER_2000", label: "$20/month" },
    { value: "TIER_2500", label: "$25/month" },
    { value: "TIER_3000", label: "$30/month" },
    { value: "TIER_4000", label: "$40/month" },
    { value: "TIER_5000", label: "$50/month" },
    { value: "TIER_7500", label: "$75/month" },
    { value: "TIER_9900", label: "$99/month" },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your creator profile and subscription settings.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
            <CardDescription>
              Your public profile information visible to subscribers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Handle (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="handle">Handle</Label>
              <Input
                id="handle"
                value={`@${initialSettings.handle}`}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Your handle cannot be changed after creation.
              </p>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                maxLength={50}
                required
              />
              <p className="text-xs text-muted-foreground">
                {displayName.length}/50 characters
              </p>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell your subscribers about yourself and your content..."
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                Plain text only. {bio.length}/500 characters.
              </p>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as CreatorCategory)}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {categories.find((c) => c.value === category)?.description}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subscription</CardTitle>
            <CardDescription>
              Configure your subscription pricing and trial settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="price">Monthly Price</Label>
              <Select
                value={subscriptionPrice}
                onValueChange={(v) =>
                  setSubscriptionPrice(v as SubscriptionPriceTier)
                }
              >
                <SelectTrigger id="price">
                  <SelectValue placeholder="Select a price" />
                </SelectTrigger>
                <SelectContent>
                  {priceTiers.map((tier) => (
                    <SelectItem key={tier.value} value={tier.value}>
                      {tier.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Existing subscribers keep their original price when you change
                pricing.
              </p>
            </div>

            {/* Trial Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="trial" className="text-base">
                  7-day free trial
                </Label>
                <p className="text-sm text-muted-foreground">
                  New subscribers get 7 days free before being charged.
                </p>
              </div>
              <Switch
                id="trial"
                checked={trialEnabled}
                onCheckedChange={setTrialEnabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Communication Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Communication</CardTitle>
            <CardDescription>
              Control how subscribers can interact with you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* DM Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="dm" className="text-base">
                  Direct Messages
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow subscribers to send you direct messages.
                </p>
              </div>
              <Switch
                id="dm"
                checked={dmEnabled}
                onCheckedChange={setDmEnabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
            <CheckCircle className="size-5 text-green-600" />
            <p className="text-sm text-green-800 dark:text-green-200">
              Settings saved successfully.
            </p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving} className="min-w-[120px]">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 size-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Account Info (Read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Status</CardTitle>
          <CardDescription>
            Information about your creator account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Account Status</span>
            <span className="font-medium capitalize">
              {initialSettings.status.replace("_", " ")}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Stripe Connected</span>
            <span className="font-medium">
              {initialSettings.stripeOnboardingComplete ? "Yes" : "No"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Verified</span>
            <span className="font-medium">
              {initialSettings.isVerified ? "Yes" : "No"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Featured</span>
            <span className="font-medium">
              {initialSettings.isFeatured ? "Yes" : "No"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
