import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import { Plus, Video, Headphones, FileText } from "lucide-react";
import { ContentListClient } from "./content-list-client";

/**
 * Content Management Page (Server Component)
 *
 * Lists all content for the creator with filters and pagination.
 */
export default async function CreatorContentPage() {
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
  const canUpload = user.creatorProfile.stripeOnboardingComplete;

  // Fetch initial content
  const initialContent = await prisma.content.findMany({
    where: {
      creatorId: user.creatorProfile.id,
      status: { not: "deleted" },
    },
    take: 20,
    orderBy: [{ createdAt: "desc" }],
    include: {
      program: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  // Get content counts by type
  const contentCounts = await prisma.content.groupBy({
    by: ["type"],
    where: {
      creatorId: user.creatorProfile.id,
      status: { not: "deleted" },
    },
    _count: true,
  });

  const countsByType = {
    video: contentCounts.find((c) => c.type === "video")?._count || 0,
    audio: contentCounts.find((c) => c.type === "audio")?._count || 0,
    text: contentCounts.find((c) => c.type === "text")?._count || 0,
  };
  const totalCount = Object.values(countsByType).reduce((a, b) => a + b, 0);

  // Fetch programs for filters
  const programs = await prisma.program.findMany({
    where: { creatorId: user.creatorProfile.id },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Content</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your videos, audio, and text posts
          </p>
        </div>

        {canUpload ? (
          <Link href="/creator/content/new" className={cn(buttonVariants())}>
            <Plus className="mr-2 size-4" />
            Create content
          </Link>
        ) : (
          <Link
            href="/creator/onboarding"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Complete setup to upload
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-semibold">{totalCount}</div>
          <div className="text-sm text-muted-foreground">Total content</div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <Video className="size-5 text-muted-foreground" />
          <div>
            <div className="text-xl font-semibold">{countsByType.video}</div>
            <div className="text-sm text-muted-foreground">Videos</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <Headphones className="size-5 text-muted-foreground" />
          <div>
            <div className="text-xl font-semibold">{countsByType.audio}</div>
            <div className="text-sm text-muted-foreground">Audio</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <FileText className="size-5 text-muted-foreground" />
          <div>
            <div className="text-xl font-semibold">{countsByType.text}</div>
            <div className="text-sm text-muted-foreground">Text posts</div>
          </div>
        </div>
      </div>

      {/* Content list (client component for interactivity) */}
      <ContentListClient
        initialContent={initialContent.map((item) => ({
          id: item.id,
          type: item.type,
          title: item.title,
          description: item.description,
          thumbnailUrl: item.thumbnailUrl,
          duration: item.duration,
          isFree: item.isFree,
          status: item.status,
          program: item.program,
          publishedAt: item.publishedAt?.toISOString() || null,
          createdAt: item.createdAt.toISOString(),
        }))}
        programs={programs}
        hasMore={initialContent.length === 20}
      />
    </div>
  );
}
