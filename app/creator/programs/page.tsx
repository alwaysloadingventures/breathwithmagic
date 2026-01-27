import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, FolderOpen } from "lucide-react";
import { ProgramListClient } from "./program-list-client";

/**
 * Programs Management Page (Server Component)
 *
 * Lists all programs/series for the creator.
 */
export default async function CreatorProgramsPage() {
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
        },
      },
    },
  });

  if (!user?.creatorProfile) {
    redirect("/become-creator");
  }

  // Fetch programs with content counts
  const programs = await prisma.program.findMany({
    where: {
      creatorId: user.creatorProfile.id,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: {
      _count: {
        select: {
          content: {
            where: { status: { not: "deleted" } },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Programs</h1>
          <p className="mt-1 text-muted-foreground">
            Organize your content into series and collections
          </p>
        </div>

        <Link href="/creator/programs/new" className={cn(buttonVariants())}>
          <Plus className="mr-2 size-4" />
          Create program
        </Link>
      </div>

      {/* Programs list */}
      {programs.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <FolderOpen className="mx-auto size-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No programs yet</h3>
          <p className="mt-2 text-muted-foreground">
            Create a program to organize your content into series or
            collections.
          </p>
          <Link
            href="/creator/programs/new"
            className={cn(buttonVariants(), "mt-4")}
          >
            <Plus className="mr-2 size-4" />
            Create your first program
          </Link>
        </div>
      ) : (
        <ProgramListClient
          programs={programs.map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            thumbnailUrl: p.thumbnailUrl,
            isFree: p.isFree,
            sortOrder: p.sortOrder,
            publishedAt: p.publishedAt?.toISOString() || null,
            createdAt: p.createdAt.toISOString(),
            contentCount: p._count.content,
          }))}
        />
      )}
    </div>
  );
}
