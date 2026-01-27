import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { EditProgramClient } from "./edit-program-client";

/**
 * Edit Program Page (Server Component)
 */
export default async function EditProgramPage({
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
        select: { id: true },
      },
    },
  });

  if (!user?.creatorProfile) {
    redirect("/become-creator");
  }

  // Fetch the program with content
  const program = await prisma.program.findFirst({
    where: {
      id,
      creatorId: user.creatorProfile.id,
    },
    include: {
      content: {
        where: {
          status: { not: "deleted" },
        },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          type: true,
          title: true,
          thumbnailUrl: true,
          duration: true,
          isFree: true,
          status: true,
          sortOrder: true,
        },
      },
    },
  });

  if (!program) {
    notFound();
  }

  // Fetch all content NOT in any program (for adding to this program)
  const availableContent = await prisma.content.findMany({
    where: {
      creatorId: user.creatorProfile.id,
      programId: null,
      status: { not: "deleted" },
    },
    select: {
      id: true,
      type: true,
      title: true,
      thumbnailUrl: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-4xl items-center px-4">
          <Link
            href="/creator/programs"
            className="flex items-center text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to programs
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-4xl px-4 py-8">
        <EditProgramClient
          program={{
            id: program.id,
            title: program.title,
            description: program.description,
            thumbnailUrl: program.thumbnailUrl,
            isFree: program.isFree,
            content: program.content,
          }}
          availableContent={availableContent}
        />
      </main>
    </div>
  );
}
