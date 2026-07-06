import { initTRPC } from "@trpc/server";
import type { User } from "@auteur/db";

/**
 * Context is built by the host (apps/web), which owns authentication.
 * By the time a procedure runs, `user` is a verified app user — this
 * package never touches Clerk.
 */
export type Context = {
  user: User;
};

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const protectedProcedure = t.procedure;
