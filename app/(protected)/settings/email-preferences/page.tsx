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
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EmailPreferencesClient } from "./email-preferences-client";

export default async function EmailPreferencesPage() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/sign-in");
  }

  // Get user and their email preferences
  const user = await prisma.user.findUnique({
    where: { clerkId },
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
