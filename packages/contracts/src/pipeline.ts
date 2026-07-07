import { z } from "zod";

/**
 * W1 ingest stage — mirrored by apps/pipeline/app.py (Pydantic-free for
 * now; the codegen check lands when the pipeline grows in Phase 4).
 * Wire format is snake_case: Python owns these payloads.
 */

export const ingestJobSchema = z.object({
  media_id: z.string(),
  kind: z.enum(["video", "photo", "audio"]),
  original_key: z.string(),
  proxy_key: z.string(),
  poster_key: z.string(),
});

export const ingestResultSchema = z.object({
  ok: z.literal(true),
  media_id: z.string(),
  duration_ms: z.number().int().nullable(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  codec: z.string().nullable(),
  fps: z.number().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  proxy_key: z.string().optional(),
  poster_key: z.string().optional(),
  poster_error: z.string().optional(),
});

export type IngestJob = z.infer<typeof ingestJobSchema>;
export type IngestResult = z.infer<typeof ingestResultSchema>;
