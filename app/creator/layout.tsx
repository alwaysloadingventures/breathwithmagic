import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CreatorHeader } from "@/components/creator";
import { CreatorNav, CreatorNavMobile } from "@/components/creator";

export const metadata: Metadata = {
  title: "Creator Dashboard | breathwithmagic",
  description: "Manage your creator profile, content, and subscribers.",
};

/**
 * Creator Layout
 *
 * Layout for all creator dashboard pages with sidebar navigation.
 */
export default async function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/sign-in");
  }

  // Fetch creator profile for navigation
  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      creatorProfile: {
        select: {
          handle: true,
        },
      },
    },
  });

  // If no creator profile, redirect to become-creator
  if (!user?.creatorProfile) {
    redirect("/become-creator");
  }

  const { handle } = user.creatorProfile;

  return (
    <div className="min-h-screen bg-background">
      <CreatorHeader />

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        {/* Mobile Navigation */}
        <div className="mb-6 lg:hidden">
          <CreatorNavMobile />
        </div>

        <div className="flex gap-8">
          {/* Desktop Sidebar Navigation */}
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-6">
              <CreatorNav handle={handle} />
            </div>
          </aside>

          {/* Main Content */}
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
