import { mediaRouter } from "./routers/media";
import { router } from "./trpc";

export const appRouter = router({
  media: mediaRouter,
});

export type AppRouter = typeof appRouter;
