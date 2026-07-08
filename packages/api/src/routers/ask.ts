import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { searchScenes } from "@auteur/db";

import { embedText } from "../pipeline";
import { presignGet } from "../r2";
import { protectedProcedure, router } from "../trpc";

export const askRouter = router({
  /**
   * Ask your films (DESIGN.md §21): natural language -> CLIP text
   * vector -> cosine search over every scene frame the user owns.
   * Frames come back presigned so the client can render immediately.
   */
  search: protectedProcedure
    .input(z.object({ q: z.string().min(2).max(200) }))
    .mutation(async ({ ctx, input }) => {
      if (!process.env.PIPELINE_EMBED_URL) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "The archive can't be asked yet — media plane not configured.",
        });
      }
      const embedding = await embedText(input.q);
      const hits = await searchScenes(ctx.user.id, embedding, 24);

      return Promise.all(
        hits.map(async (h) => ({
          sceneId: h.scene.id,
          mediaId: h.media.id,
          kind: h.media.kind,
          fileName: h.media.fileName,
          capturedAt: (h.media.capturedAt ?? h.media.createdAt).toISOString(),
          startMs: h.scene.startMs,
          endMs: h.scene.endMs,
          similarity: h.similarity,
          frameUrl: await presignGet(h.scene.frameKey),
        })),
      );
    }),
});
