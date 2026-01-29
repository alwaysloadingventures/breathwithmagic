/**
 * Unsubscribe Page
 *
 * Allows users to manage email preferences without logging in.
 * Uses secure token in URL for authentication.
 *
 * PRD Requirements:
 * - Accepts token in URL for authentication
 * - Shows current preferences
 * - One-click unsubscribe from specific type or all
 * - No login required (uses secure token)
 */

import { verifyUnsubscribeToken } from "@/lib/email-tokens";
import { prisma } from "@/lib/prisma";
import { UnsubscribeClient } from "./unsubscribe-client";
import Link from "next/link";

interface UnsubscribePageProps {
  searchParams: Promise<{ token?: string; type?: string }>;
}

export default async function UnsubscribePage({
  searchParams,
}: UnsubscribePageProps) {
  const params = await searchParams;
  const { token, type } = params;

  // Handle missing token
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-foreground mb-4 text-2xl font-semibold">
            Invalid Link
          </h1>
          <p className="text-muted-foreground mb-6">
            This unsubscribe link is invalid or missing. Please use the link
            from your email or sign in to manage your preferences.
          </p>
          <Link
            href="/sign-in"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-lg px-6 py-3 font-medium transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  // Verify token
  const userId = verifyUnsubscribeToken(token);

  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-foreground mb-4 text-2xl font-semibold">
            Link Expired
          </h1>
          <p className="text-muted-foreground mb-6">
            This unsubscribe link has expired. Please use a more recent email or
            sign in to manage your preferences.
          </p>
          <Link
            href="/sign-in"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-lg px-6 py-3 font-medium transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  // Get user and their email preferences
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      emailPreferences: true,
    },
  });

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-foreground mb-4 text-2xl font-semibold">
            User Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            We could not find your account. It may have been deleted.
          </p>
          <Link
            href="/"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-lg px-6 py-3 font-medium transition-colors"
          >
            Go to homepage
          </Link>
        </div>
      </div>
    );
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
    <UnsubscribeClient
      token={token}
      userId={userId}
      initialType={type || null}
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
