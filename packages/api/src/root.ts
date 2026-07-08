import { askRouter } from "./routers/ask";
import { mediaRouter } from "./routers/media";
import { router } from "./trpc";

export const appRouter = router({
  ask: askRouter,
  media: mediaRouter,
});

export type AppRouter = typeof appRouter;
