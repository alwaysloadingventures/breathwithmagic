import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SubscribersClient } from "./subscribers-client";

/**
 * Subscribers Page
 *
 * Server component that fetches initial subscriber data and renders
 * the client component for interactivity.
 */
export default async function SubscribersPage() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/sign-in");
  }

  // Fetch creator profile
  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      creatorProfile: {
        select: { id: true },
      },
    },
  });

  if (!user?.creatorProfile) {
    redirect("/become-creator");
  }

  const creatorId = user.creatorProfile.id;

  // Fetch initial subscribers (active + trialing)
  const limit = 20;

  const [subscriptions, total] = await Promise.all([
    prisma.subscription.findMany({
      where: {
        creatorId,
        status: { in: ["active", "trialing"] },
      },
      take: limit + 1,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    }),
    prisma.subscription.count({
      where: {
        creatorId,
        status: { in: ["active", "trialing"] },
      },
    }),
  ]);

  // Determine if there's more
  const hasMore = subscriptions.length > limit;
  const items = hasMore ? subscriptions.slice(0, limit) : subscriptions;

  // Transform to client format
  const initialSubscribers = items.map((sub) => ({
    id: sub.id,
    userId: sub.userId,
    user: {
      id: sub.user.id,
      name: sub.user.name,
      email: sub.user.email,
      avatarUrl: sub.user.avatarUrl,
    },
    status: sub.status as "active" | "trialing" | "canceled" | "past_due",
    priceAtPurchase: sub.priceAtPurchase,
    currentPeriodStart: sub.currentPeriodStart?.toISOString() || null,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() || null,
    createdAt: sub.createdAt.toISOString(),
  }));

  return (
    <SubscribersClient
      initialSubscribers={initialSubscribers}
      initialHasMore={hasMore}
      initialTotal={total}
    />
  );
}
