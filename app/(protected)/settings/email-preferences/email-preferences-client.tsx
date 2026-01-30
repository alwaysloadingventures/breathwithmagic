"use client";

/**
 * Notification Preferences Client Component
 *
 * Handles the interactive notification preferences form with toggle switches.
 * Currently manages email notifications, with in-app notifications planned.
 * Uses optimistic updates and shows confirmation toast on save.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Bell, CreditCard, Heart, Megaphone, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface EmailPreferences {
  newContent: boolean;
  newMessage: boolean;
  trialReminders: boolean;
  paymentAlerts: boolean;
  subscriptionUpdates: boolean;
  marketing: boolean;
}

interface EmailPreferencesClientProps {
  initialPreferences: EmailPreferences;
}

/**
 * Email preference configuration with descriptions and icons
 */
const EMAIL_PREFERENCES_CONFIG = [
  {
    key: "newContent" as const,
    label: "New content notifications",
    description:
      "Get notified when creators you follow or subscribe to publish new content.",
    icon: Heart,
  },
  {
    key: "newMessage" as const,
    label: "Message notifications",
    description: "Get notified when you receive a direct message from a creator.",
    icon: Mail,
  },
  {
    key: "trialReminders" as const,
    label: "Trial reminders",
    description:
      "Receive a reminder before your free trial ends so you can decide whether to continue.",
    icon: Bell,
  },
  {
    key: "paymentAlerts" as const,
    label: "Payment alerts",
    description:
      "Get notified if there is an issue with your payment so you can update your payment method.",
    icon: CreditCard,
  },
  {
    key: "subscriptionUpdates" as const,
    label: "Subscription updates",
    description:
      "Receive confirmations when you subscribe, when your subscription renews, or when changes are made.",
    icon: Bell,
  },
  {
    key: "marketing" as const,
    label: "Marketing emails",
    description:
      "Occasionally hear about new features, creator spotlights, and platform updates.",
    icon: Megaphone,
  },
];

export function EmailPreferencesClient({
  initialPreferences,
}: EmailPreferencesClientProps) {
  const router = useRouter();
  const [preferences, setPreferences] = useState<EmailPreferences>(initialPreferences);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  /**
   * Handle toggle change for a specific preference
   */
  const handleToggle = (key: keyof EmailPreferences, checked: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: checked,
    }));
    setHasChanges(true);
  };

  /**
   * Save preferences to the server
   */
  const handleSave = async () => {
    setIsSaving(true);

    try {
      const response = await fetch("/api/user/email-preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save preferences");
      }

      toast.success("Email preferences saved", {
        description: "Your notification settings have been updated.",
      });

      setHasChanges(false);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast.error("Could not save preferences", {
        description: message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Unsubscribe from all email notifications
   */
  const handleUnsubscribeAll = () => {
    setPreferences({
      newContent: false,
      newMessage: false,
      trialReminders: false,
      paymentAlerts: false,
      subscriptionUpdates: false,
      marketing: false,
    });
    setHasChanges(true);
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/settings"
          className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-2 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to settings
        </Link>

        <h1 className="text-foreground text-2xl font-semibold">
          Notification Preferences
        </h1>
        <p className="text-muted-foreground mt-1">
          Choose which email and in-app notifications you receive from breathwithmagic.
        </p>
      </div>

      {/* Preferences */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Notification Emails</CardTitle>
          <CardDescription>
            These emails help you stay updated with your subscriptions and messages.
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
                  <div className="space-y-1">
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="ghost"
          onClick={handleUnsubscribeAll}
          className="text-muted-foreground hover:text-foreground order-2 sm:order-1"
        >
          Unsubscribe from all
        </Button>

        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="order-1 min-w-[120px] sm:order-2"
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
      </div>

      {/* Help text */}
      <p className="text-muted-foreground mt-8 text-center text-sm">
        You can also manage email preferences from the unsubscribe link at the
        bottom of any email.
      </p>
    </div>
  );
}
