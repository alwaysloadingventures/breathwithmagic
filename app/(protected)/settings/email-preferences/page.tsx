/**
 * Email Preferences Settings Page
 *
 * Allows users to manage their email notification preferences.
 * Toggle switches for each email type with clear descriptions.
 *
 * PRD Requirements:
 * - Users can opt-in/opt-out of each email type
 * - Clear descriptions of what each email type means
 * - Save button with confirmation
 */
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensure-user";
import { EmailPreferencesClient } from "./email-preferences-client";

export default async function EmailPreferencesPage() {
  // Ensure user exists in database (auto-creates if not)
  const userResult = await ensureUser();
  if (!userResult) {
    redirect("/sign-in");
  }

  // Get user with their email preferences
  const user = await prisma.user.findUnique({
    where: { id: userResult.user.id },
    include: {
      emailPreferences: true,
    },
  });

  if (!user) {
    redirect("/sign-in");
  }

  // Get or use default preferences
  const preferences = user.emailPreferences || {
    newContent: true,
    newMessage: true,
    trialReminders: true,
    paymentAlerts: true,
    subscriptionUpdates: true,
    marketing: false,
  };

  return (
    <EmailPreferencesClient
      initialPreferences={{
        newContent: preferences.newContent,
        newMessage: preferences.newMessage,
        trialReminders: preferences.trialReminders,
        paymentAlerts: preferences.paymentAlerts,
        subscriptionUpdates: preferences.subscriptionUpdates,
        marketing: preferences.marketing,
      }}
    />
  );
}
