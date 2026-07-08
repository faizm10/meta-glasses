import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  applyFilmRender,
  createFilmWithVersion,
  findFilmForDay,
  findFilmForUser,
  getTasteSlugs,
  latestDayWithScenes,
  listFilms,
  listRenderingFilms,
  markFilmRendering,
  scenesForDay,
  setFilmStatus,
} from "@auteur/db";
import { renderResultSchema, type RenderJob } from "@auteur/contracts";

import { pipelineConfigured, pollResult, submitRender } from "../pipeline";
import { presignGet } from "../r2";
import { buildSceneContexts, buildTimeline, generateStory } from "../story";
import { protectedProcedure, router } from "../trpc";

export const filmsRouter = router({
  /**
   * W2, manual trigger for v1: cut a film from the most recent day of
   * footage. Story pass (the model watches the frames) -> EDL ->
   * render on the media plane. The nightly scheduler (Phase 11) will
   * call this same path.
   */
  cutLatestDay: protectedProcedure.mutation(async ({ ctx }) => {
    if (!pipelineConfigured() || !process.env.AI_GATEWAY_API_KEY) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "The cutting room isn't wired — pipeline or AI gateway keys missing.",
      });
    }
    const day = await latestDayWithScenes(ctx.user.id);
    if (!day) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "No analyzed dailies yet. Upload footage and let it develop first.",
      });
    }
    const existing = await findFilmForDay(ctx.user.id, day);
    if (existing) {
      return { filmId: existing.id, status: existing.status, already: true as const };
    }

    const rows = await scenesForDay(ctx.user.id, day);
    if (rows.length < 2) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Not enough scenes on that day for a film. Shoot a little more.",
      });
    }

    const contexts = await buildSceneContexts(rows);
    const taste = await getTasteSlugs(ctx.user.id);
    const story = await generateStory(contexts, taste);
    const { timeline, chapters } = buildTimeline(story, rows);

    const heroRow = rows.find((r) => r.scene.id === story.heroSceneId);
    const film = await createFilmWithVersion({
      userId: ctx.user.id,
      title: story.title,
      logline: story.logline,
      note: story.note,
      chapters,
      coversDate: day,
      heroFrameKey: heroRow?.scene.frameKey ?? null,
      timeline,
    });

    const byScene = new Map(rows.map((r) => [r.scene.id, r]));
    const job: RenderJob = {
      film_id: film.id,
      output_key: `films/${ctx.user.id}/${film.id}/film.mp4`,
      title: story.title,
      credit: `directed by ${ctx.user.displayName ?? "you"}`,
      clips: timeline.clips.map((c) => {
        const row = byScene.get(c.sceneId)!;
        if (!row.media.proxyKey) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        return { proxy_key: row.media.proxyKey, in_ms: c.inMs, out_ms: c.outMs };
      }),
    };
    const callId = await submitRender(job);
    await markFilmRendering(ctx.user.id, film.id, callId);

    return { filmId: film.id, status: "rendering" as const, already: false as const };
  }),

  get: protectedProcedure
    .input(z.object({ filmId: z.string() }))
    .query(async ({ ctx, input }) => {
      const film = await findFilmForUser(ctx.user.id, input.filmId);
      if (!film) throw new TRPCError({ code: "NOT_FOUND" });
      return {
        ...film,
        filmUrl: film.filmKey ? await presignGet(film.filmKey) : null,
        heroUrl: film.heroFrameKey ? await presignGet(film.heroFrameKey) : null,
      };
    }),

  list: protectedProcedure.query(({ ctx }) => listFilms(ctx.user.id)),
});

/** Poll-on-read for films, mirroring media (pipeline.ts owns the HTTP). */
export async function refreshRenderingFilms(userId: string): Promise<void> {
  if (!pipelineConfigured()) return;
  const rendering = await listRenderingFilms(userId);
  await Promise.all(
    rendering.map(async (f) => {
      if (!f.pipelineRef) return;
      try {
        const out = await pollResult(f.pipelineRef);
        if (out.status === "done") {
          const r = renderResultSchema.parse(out.result);
          await applyFilmRender(userId, f.id, {
            filmKey: r.film_key,
            durationMs: r.duration_ms,
          });
        } else if (out.status === "failed") {
          await setFilmStatus(userId, f.id, "failed");
        }
      } catch {
        // transient — next page load retries
      }
    }),
  );
}
