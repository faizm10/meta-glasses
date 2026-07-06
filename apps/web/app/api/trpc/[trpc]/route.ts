import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@auteur/api";

import { ensureUser } from "@/lib/ensure-user";

/**
 * The single tRPC endpoint. proxy.ts already requires a session for
 * /api/*; ensureUser resolves it to an app user for the context.
 */
const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => ({ user: await ensureUser() }),
  });

export { handler as GET, handler as POST };
