import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { ProgramFormClient } from "../program-form-client";

/**
 * Create Program Page (Server Component)
 */
export default async function CreateProgramPage() {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
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
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Create program</h1>
          <p className="mt-1 text-muted-foreground">
            Organize your content into a series or collection
          </p>
        </div>

        <ProgramFormClient mode="create" />
      </main>
    </div>
  );
}
