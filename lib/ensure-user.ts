/**
 * ensureUser - Sync Clerk user to database
 *
 * Ensures that a User record exists in the database for the current Clerk user.
 * If the user doesn't exist, creates one from Clerk data.
 * If the user exists but data has changed, updates it.
 *
 * This is the solution to the P0 blocker where users authenticated via Clerk
 * don't have corresponding database records.
 *
 * Usage:
 * ```ts
 * const user = await ensureUser();
 * if (!user) {
 *   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 * }
 * // user is now the database User record
 * ```
 */
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

export interface EnsureUserResult {
  user: User;
  isNewUser: boolean;
}

/**
 * Ensures a User record exists in the database for the authenticated Clerk user.
 *
 * @returns The database User record and whether it was newly created, or null if not authenticated
 */
export async function ensureUser(): Promise<EnsureUserResult | null> {
  // Get Clerk auth info
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return null;
  }

  // Check if user already exists in database
  const existingUser = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (existingUser) {
    // User exists - optionally sync data from Clerk
    // We do a lightweight sync on each request to keep data fresh
    const clerkUser = await currentUser();

    if (clerkUser) {
      const shouldUpdate =
        existingUser.email !== clerkUser.emailAddresses[0]?.emailAddress ||
        existingUser.name !==
          `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
        existingUser.avatarUrl !== clerkUser.imageUrl;

      if (shouldUpdate) {
        const updatedUser = await prisma.user.update({
          where: { clerkId },
          data: {
            email:
              clerkUser.emailAddresses[0]?.emailAddress || existingUser.email,
            name:
              `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
              existingUser.name,
            avatarUrl: clerkUser.imageUrl || existingUser.avatarUrl,
          },
        });
        return { user: updatedUser, isNewUser: false };
      }
    }

    return { user: existingUser, isNewUser: false };
  }

  // User doesn't exist - create from Clerk data
  const clerkUser = await currentUser();
  if (!clerkUser) {
    // This shouldn't happen if auth() returned a clerkId
    console.error(
      "ensureUser: auth() returned clerkId but currentUser() returned null",
    );
    return null;
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) {
    console.error("ensureUser: Clerk user has no email address");
    return null;
  }

  const name =
    `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null;

  // Create the user
  const newUser = await prisma.user.create({
    data: {
      clerkId,
      email,
      name,
      avatarUrl: clerkUser.imageUrl || null,
      role: "user",
    },
  });

  console.log(`ensureUser: Created new user ${newUser.id} for Clerk ${clerkId}`);

  return { user: newUser, isNewUser: true };
}

/**
 * Gets the database user for the current Clerk session.
 * Does NOT create the user if they don't exist.
 *
 * Use this for read-only operations where you want to handle
 * missing users differently.
 */
export async function getDbUser(): Promise<User | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { clerkId },
  });
}

/**
 * Gets the database user ID for the current Clerk session.
 * Creates the user if they don't exist.
 *
 * Convenience wrapper for the common case of just needing the user ID.
 */
export async function ensureUserId(): Promise<string | null> {
  const result = await ensureUser();
  return result?.user.id ?? null;
}
