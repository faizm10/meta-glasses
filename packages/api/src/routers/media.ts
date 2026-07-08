import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  deleteMediaRow,
  findMediaByHash,
  findMediaForUser,
  listRecentMedia,
  listSceneFrameKeys,
  markProcessing,
  newId,
  registerUpload,
  setMediaStatus,
} from "@auteur/db";

import { resolveMedia } from "@auteur/contracts";

import { pipelineConfigured, submitIngest } from "../pipeline";

import { deleteObject, headObjectBytes, presignUpload, r2Configured } from "../r2";
import { protectedProcedure, router } from "../trpc";

const MAX_BYTES = 4.9 * 1024 * 1024 * 1024; // R2 single-PUT ceiling

export const mediaRouter = router({
  /**
   * Registers a daily and returns a presigned PUT. The browser uploads
   * directly to R2 — bytes never touch this API (ARCHITECTURE.md R3).
   */
  beginUpload: protectedProcedure
    .input(
      z.object({
        fileName: z.string().max(300),
        mime: z.string().max(100),
        bytes: z.number().int().positive().max(MAX_BYTES),
        contentHash: z.string().regex(/^[a-f0-9]{64}$/),
        capturedAt: z.iso.datetime().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!r2Configured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "The archive isn't connected yet — add R2 keys to .env.local.",
        });
      }
      // Same resolution the client ran — extension rescues footage the
      // browser reports with an empty or useless MIME (.mov, notably).
      const resolved = resolveMedia(input.fileName, input.mime);
      if (!resolved) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only video, photo, and audio dailies can develop here.",
        });
      }
      const { kind, mime } = resolved;

      const existing = await findMediaByHash(ctx.user.id, input.contentHash);
      if (existing) {
        return { duplicate: true as const, mediaId: existing.id };
      }

      const ext = input.fileName.includes(".")
        ? input.fileName.split(".").pop()!.toLowerCase().slice(0, 8)
        : "bin";
      // Content-addressed, immutable key (ARCHITECTURE.md §5).
      const id = newId();
      const key = `originals/${ctx.user.id}/${id}/${input.contentHash}.${ext}`;
      const row = await registerUpload({
        id,
        userId: ctx.user.id,
        kind,
        fileName: input.fileName,
        mime,
        bytes: input.bytes,
        contentHash: input.contentHash,
        capturedAt: input.capturedAt ? new Date(input.capturedAt) : null,
        originalKey: key,
      });
      const uploadUrl = await presignUpload(key, mime);

      return { duplicate: false as const, mediaId: row.id, uploadUrl };
    }),

  /** Called after the browser PUT succeeds; verifies bytes actually landed. */
  completeUpload: protectedProcedure
    .input(z.object({ mediaId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = await findMediaForUser(ctx.user.id, input.mediaId);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.status !== "uploading") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "not uploading" });
      }
      const stored = await headObjectBytes(row.originalKey);
      if (stored !== row.bytes) {
        await setMediaStatus(ctx.user.id, row.id, "failed");
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Upload didn't land intact. Try again.",
        });
      }
      await setMediaStatus(ctx.user.id, row.id, "uploaded");

      if (pipelineConfigured()) {
        try {
          const callId = await submitIngest({ ...row, status: "uploaded" });
          await markProcessing(ctx.user.id, row.id, callId);
        } catch {
          // Daily is safe in R2 either way; ingest can be retried later.
        }
      }
      return { ok: true as const };
    }),

  abortUpload: protectedProcedure
    .input(z.object({ mediaId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = await findMediaForUser(ctx.user.id, input.mediaId);
      if (!row || row.status !== "uploading") return { ok: true as const };
      await deleteObject(row.originalKey).catch(() => {});
      await deleteMediaRow(ctx.user.id, row.id);
      return { ok: true as const };
    }),

  list: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }).optional())
    .query(({ ctx, input }) => listRecentMedia(ctx.user.id, input?.limit)),

  /**
   * Cut a daily from the archive — row and every stored object. The
   * originals are the user's negatives; deleting them must be honest
   * and total (DESIGN.md §25), so storage goes first: if R2 fails we
   * keep the row rather than orphan invisible bytes.
   */
  remove: protectedProcedure
    .input(z.object({ mediaId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = await findMediaForUser(ctx.user.id, input.mediaId);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });

      const frameKeys = await listSceneFrameKeys(row.id);
      const keys = [
        row.originalKey,
        row.proxyKey,
        row.posterKey,
        row.spriteKey,
        ...frameKeys,
      ].filter((k): k is string => Boolean(k));
      await Promise.all(keys.map((k) => deleteObject(k)));
      await deleteMediaRow(ctx.user.id, row.id); // scenes/transcripts cascade
      return { ok: true as const };
    }),
});
