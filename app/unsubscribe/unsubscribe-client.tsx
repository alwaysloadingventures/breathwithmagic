"use client";

/**
 * Unsubscribe Client Component
 *
 * Handles the unsubscribe form interaction without requiring login.
 * Shows quick unsubscribe options and full preference management.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { Check, Mail, Bell, CreditCard, Heart, Megaphone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface EmailPreferences {
  newContent: boolean;
  newMessage: boolean;
  trialReminders: boolean;
  paymentAlerts: boolean;
  subscriptionUpdates: boolean;
  marketing: boolean;
}

interface UnsubscribeClientProps {
  token: string;
  userId: string;
  initialType: string | null;
  initialPreferences: EmailPreferences;
}

/**
 * Map of email types to preference keys
 */
const TYPE_TO_KEY: Record<string, keyof EmailPreferences> = {
  newContent: "newContent",
  newMessage: "newMessage",
  trialReminders: "trialReminders",
  paymentAlerts: "paymentAlerts",
  subscriptionUpdates: "subscriptionUpdates",
  marketing: "marketing",
};

/**
 * Email preference configuration with descriptions and icons
 */
const EMAIL_PREFERENCES_CONFIG = [
  {
    key: "newContent" as const,
    label: "New content notifications",
    description: "When creators you follow publish new content",
    icon: Heart,
  },
  {
    key: "newMessage" as const,
    label: "Message notifications",
    description: "When you receive direct messages",
    icon: Mail,
  },
  {
    key: "trialReminders" as const,
    label: "Trial reminders",
    description: "Before your free trial ends",
    icon: Bell,
  },
  {
    key: "paymentAlerts" as const,
    label: "Payment alerts",
    description: "When there are issues with your payment",
    icon: CreditCard,
  },
  {
    key: "subscriptionUpdates" as const,
    label: "Subscription updates",
    description: "Confirmations and renewal notices",
    icon: Bell,
  },
  {
    key: "marketing" as const,
    label: "Marketing emails",
    description: "Feature updates and platform news",
    icon: Megaphone,
  },
];

export function UnsubscribeClient({
  token,
  userId: _userId,
  initialType,
  initialPreferences,
}: UnsubscribeClientProps) {
  // Note: userId is passed for potential future use (e.g., analytics)
  void _userId;
  const [preferences, setPreferences] = useState<EmailPreferences>(initialPreferences);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickUnsubscribed, setQuickUnsubscribed] = useState(false);

  // Auto-unsubscribe from specific type if provided
  useEffect(() => {
    if (initialType && TYPE_TO_KEY[initialType] && !quickUnsubscribed) {
      handleQuickUnsubscribe(TYPE_TO_KEY[initialType]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Quick unsubscribe from a specific email type
   */
  const handleQuickUnsubscribe = async (key: keyof EmailPreferences) => {
    setIsSaving(true);
    setError(null);

    const newPreferences = { ...preferences, [key]: false };

    try {
      const response = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          preferences: newPreferences,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update preferences");
      }

      setPreferences(newPreferences);
      setQuickUnsubscribed(true);
      setSaveSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle toggle change for a specific preference
   */
  const handleToggle = (key: keyof EmailPreferences, checked: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: checked,
    }));
    setSaveSuccess(false);
  };

  /**
   * Save all preferences
   */
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          preferences,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update preferences");
      }

      setSaveSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Unsubscribe from all emails
   */
  const handleUnsubscribeAll = async () => {
    setIsSaving(true);
    setError(null);

    const allOff = {
      newContent: false,
      newMessage: false,
      trialReminders: false,
      paymentAlerts: false,
      subscriptionUpdates: false,
      marketing: false,
    };

    try {
      const response = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          preferences: allOff,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update preferences");
      }

      setPreferences(allOff);
      setSaveSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Success state
  if (saveSuccess && quickUnsubscribed) {
    const unsubType = initialType ? TYPE_TO_KEY[initialType] : null;
    const typeLabel = unsubType
      ? EMAIL_PREFERENCES_CONFIG.find((c) => c.key === unsubType)?.label
      : null;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="bg-primary/10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full">
            <Check className="text-primary h-8 w-8" />
          </div>
          <h1 className="text-foreground mb-4 text-2xl font-semibold">
            All set
          </h1>
          <p className="text-muted-foreground mb-6">
            {typeLabel
              ? `You won't get ${typeLabel.toLowerCase()} anymore.`
              : "Your email preferences have been updated."}
          </p>
          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={() => {
                setQuickUnsubscribed(false);
                setSaveSuccess(false);
              }}
              className="w-full"
            >
              Manage all preferences
            </Button>
            <Link href="/" className="text-muted-foreground hover:text-primary block text-sm">
              Return to breathwithmagic
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="text-primary mb-4 inline-block text-xl font-semibold">
            breathwithmagic
          </Link>
          <h1 className="text-foreground text-2xl font-semibold">
            Email Preferences
          </h1>
          <p className="text-muted-foreground mt-2">
            Choose which emails you would like to receive.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-destructive/10 text-destructive mb-6 rounded-lg p-4 text-sm">
            {error}
          </div>
        )}

        {/* Success message */}
        {saveSuccess && !quickUnsubscribed && (
          <div className="bg-primary/10 mb-6 rounded-lg p-4 text-sm text-primary">
            Your email preferences have been saved.
          </div>
        )}

        {/* Preferences */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>
              Toggle each email type on or off.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {EMAIL_PREFERENCES_CONFIG.map((config) => {
              const Icon = config.icon;
              return (
                <div
                  key={config.key}
                  className="flex items-start justify-between gap-4"
                >
                  <div className="flex gap-3">
                    <div className="bg-muted text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5">
                      <Label
                        htmlFor={config.key}
                        className="text-foreground cursor-pointer text-base font-medium"
                      >
                        {config.label}
                      </Label>
                      <p className="text-muted-foreground text-sm">
                        {config.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id={config.key}
                    checked={preferences[config.key]}
                    onCheckedChange={(checked) =>
                      handleToggle(config.key, checked)
                    }
                    aria-label={`Toggle ${config.label}`}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save preferences"
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleUnsubscribeAll}
            disabled={isSaving}
            className="w-full"
          >
            Unsubscribe from all emails
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-muted-foreground hover:text-primary text-sm transition-colors"
          >
            Return to breathwithmagic
          </Link>
        </div>
      </div>
    </div>
  );
}
