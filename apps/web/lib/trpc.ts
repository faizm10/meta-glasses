import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@auteur/api";

/**
 * Vanilla typed client for imperative flows (uploads). When list-heavy
 * screens arrive (Phase 3+) we add TanStack Query on top; server
 * components keep calling @auteur/db queries directly.
 */
export const api = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: "/api/trpc" })],
});
