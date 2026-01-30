import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";
import { Header, PublicHeader } from "./header";

/**
 * SmartHeader - Server component that renders the appropriate header
 *
 * Shows PublicHeader for unauthenticated users and Header for authenticated users.
 * Use this on pages that are accessible to both (explore, creator profiles).
 */
export async function SmartHeader() {
  const { userId } = await auth();

  if (!userId) {
    return <PublicHeader />;
  }

  // Get user info for personalization
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: {
      name: true,
      role: true,
    },
  });

  return (
    <Header
      isCreator={user?.role === "creator"}
      userName={user?.name?.split(" ")[0] || undefined}
    />
  );
}
