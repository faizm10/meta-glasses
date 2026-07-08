import { askRouter } from "./routers/ask";
import { filmsRouter } from "./routers/films";
import { mediaRouter } from "./routers/media";
import { router } from "./trpc";

export const appRouter = router({
  ask: askRouter,
  films: filmsRouter,
  media: mediaRouter,
});

export type AppRouter = typeof appRouter;
