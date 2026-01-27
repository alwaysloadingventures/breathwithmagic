import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { EditContentClient } from "./edit-content-client";

/**
 * Edit Content Page (Server Component)
 *
 * Edit existing content including media uploads.
 */
export default async function EditContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
        },
      },
    },
  });

  if (!user?.creatorProfile) {
    redirect("/become-creator");
  }

  // Fetch the content
  const content = await prisma.content.findFirst({
    where: {
      id,
      creatorId: user.creatorProfile.id,
    },
    include: {
      program: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!content) {
    notFound();
  }

  // Cannot edit deleted content
  if (content.status === "deleted") {
    redirect("/creator/content");
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
          <h1 className="text-2xl font-semibold">Edit content</h1>
          <p className="mt-1 text-muted-foreground">
            Update your {content.type} content
          </p>
        </div>

        <EditContentClient
          content={{
            id: content.id,
            type: content.type,
            title: content.title,
            description: content.description,
            mediaUrl: content.mediaUrl,
            thumbnailUrl: content.thumbnailUrl,
            duration: content.duration,
            isFree: content.isFree,
            status: content.status,
            programId: content.programId,
            publishedAt: content.publishedAt?.toISOString() || null,
          }}
          programs={programs}
        />
      </main>
    </div>
  );
}
