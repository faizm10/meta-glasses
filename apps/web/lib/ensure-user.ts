import { currentUser } from "@clerk/nextjs/server";
import { upsertUserFromClerk, type User } from "@auteur/db";

/**
 * Get-or-create the app user for the signed-in Clerk identity.
 *
 * v1 sync strategy: lazy upsert on first authenticated page load instead
 * of Clerk webhooks — webhooks can't reach localhost and add a tunnel to
 * every dev setup. When we deploy (Phase 11/12) a webhook takes over
 * lifecycle events (deletes, profile changes); this stays as a fallback.
 */
export async function ensureUser(): Promise<User> {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    // proxy.ts guarantees auth on all non-public routes; reaching this
    // means a route was made public by mistake — fail loudly.
    throw new Error("ensureUser called without a signed-in user");
  }

  const displayName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    null;

  return upsertUserFromClerk(clerkUser.id, displayName);
}
