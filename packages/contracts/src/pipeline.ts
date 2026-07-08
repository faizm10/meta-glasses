import { z } from "zod";

/**
 * W1 ingest stage — mirrored by apps/pipeline/app.py (Pydantic-free for
 * now; the codegen check lands when the pipeline grows in Phase 4).
 * Wire format is snake_case: Python owns these payloads.
 */

/** CLIP ViT-B-32 — every embedding in the system is this shape. */
export const EMBEDDING_DIM = 512;

export const ingestJobSchema = z.object({
  media_id: z.string(),
  kind: z.enum(["video", "photo", "audio"]),
  original_key: z.string(),
  proxy_key: z.string(),
  poster_key: z.string(),
  /** Scene frames land at `${scene_prefix}/${idx}.jpg`. */
  scene_prefix: z.string(),
});

export const detectedSceneSchema = z.object({
  idx: z.number().int(),
  start_ms: z.number().int(),
  end_ms: z.number().int(),
  frame_key: z.string(),
  embedding: z.array(z.number()).length(EMBEDDING_DIM),
});

export const transcriptSegmentSchema = z.object({
  start_ms: z.number().int(),
  end_ms: z.number().int(),
  text: z.string(),
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
  scene_debug: z.string().optional(),
  scenes: z.array(detectedSceneSchema).default([]),
  transcript: z.array(transcriptSegmentSchema).default([]),
});

export const embedResultSchema = z.object({
  status: z.literal("done"),
  embedding: z.array(z.number()).length(EMBEDDING_DIM),
});

export type IngestJob = z.infer<typeof ingestJobSchema>;
export type IngestResult = z.infer<typeof ingestResultSchema>;
export type DetectedScene = z.infer<typeof detectedSceneSchema>;
