import { eq } from "drizzle-orm";

import { db } from "../client";
import { tasteProfiles, users, type User } from "../schema";

export async function findUserByClerkId(clerkId: string): Promise<User | undefined> {
  return db().query.users.findFirst({ where: eq(users.clerkId, clerkId) });
}

export async function upsertUserFromClerk(
  clerkId: string,
  displayName: string | null,
): Promise<User> {
  const [user] = await db()
    .insert(users)
    .values({ clerkId, displayName })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: { displayName, updatedAt: new Date() },
    })
    .returning();
  if (!user) throw new Error("user upsert returned no row");
  return user;
}

/** Saves the taste picks and marks onboarding complete in one call. */
export async function completeUserOnboarding(
  userId: string,
  pickedStills: string[],
): Promise<void> {
  await db()
    .insert(tasteProfiles)
    .values({ userId, pickedStills })
    .onConflictDoUpdate({
      target: tasteProfiles.userId,
      set: { pickedStills, updatedAt: new Date() },
    });
  await db().update(users).set({ onboardedAt: new Date() }).where(eq(users.id, userId));
}
