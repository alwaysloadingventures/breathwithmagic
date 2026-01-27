import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "./settings-client";
import type {
  CreatorCategory,
  SubscriptionPriceTier,
} from "@/lib/validations/creator";

/**
 * Creator Settings Page
 *
 * Server component that fetches initial settings and renders
 * the client component for editing.
 */
export default async function SettingsPage() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/sign-in");
  }

  // Fetch creator profile with all settings
  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      creatorProfile: {
        select: {
          id: true,
          handle: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          coverImageUrl: true,
          category: true,
          subscriptionPrice: true,
          trialEnabled: true,
          dmEnabled: true,
          stripeAccountId: true,
          stripeOnboardingComplete: true,
          status: true,
          isVerified: true,
          isFeatured: true,
        },
      },
    },
  });

  if (!user?.creatorProfile) {
    redirect("/become-creator");
  }

  const settings = {
    id: user.creatorProfile.id,
    handle: user.creatorProfile.handle,
    displayName: user.creatorProfile.displayName,
    bio: user.creatorProfile.bio,
    avatarUrl: user.creatorProfile.avatarUrl,
    coverImageUrl: user.creatorProfile.coverImageUrl,
    category: user.creatorProfile.category as CreatorCategory,
    subscriptionPrice: user.creatorProfile
      .subscriptionPrice as SubscriptionPriceTier,
    trialEnabled: user.creatorProfile.trialEnabled,
    dmEnabled: user.creatorProfile.dmEnabled,
    stripeAccountId: user.creatorProfile.stripeAccountId,
    stripeOnboardingComplete: user.creatorProfile.stripeOnboardingComplete,
    status: user.creatorProfile.status,
    isVerified: user.creatorProfile.isVerified,
    isFeatured: user.creatorProfile.isFeatured,
  };

  return <SettingsClient initialSettings={settings} />;
}
