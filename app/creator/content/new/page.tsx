import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { CreateContentClient } from "./create-content-client";

/**
 * Create Content Page (Server Component)
 *
 * Multi-step wizard for creating new content.
 */
export default async function CreateContentPage() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/sign-in");
  }

  // Fetch user and creator profile
  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      creatorProfile: {
        select: {
          id: true,
          handle: true,
          displayName: true,
          status: true,
          stripeOnboardingComplete: true,
        },
      },
    },
  });

  if (!user?.creatorProfile) {
    redirect("/become-creator");
  }

  // Check if creator can upload (Stripe must be complete)
  if (!user.creatorProfile.stripeOnboardingComplete) {
    redirect("/creator/onboarding");
  }

  // Fetch programs for content assignment
  const programs = await prisma.program.findMany({
    where: { creatorId: user.creatorProfile.id },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <Link
            href="/creator/content"
            className="flex items-center text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to content
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Create content</h1>
          <p className="mt-1 text-muted-foreground">
            Share something new with your subscribers
          </p>
        </div>

        <CreateContentClient programs={programs} />
      </main>
    </div>
  );
}
