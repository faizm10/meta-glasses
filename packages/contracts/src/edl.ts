import { z } from "zod";

/**
 * The Edit Decision List — the single document that fully describes a cut.
 *
 * This is the treaty between the control plane (TypeScript, generates and
 * edits EDLs) and the media plane (Python, renders them). It is stored as
 * versioned JSONB in `film_versions.timeline` and must remain renderable
 * forever: never mutate the meaning of an existing field — add fields and
 * bump `version` instead.
 */

export const EDL_VERSION = 1;

export const transitionSchema = z.object({
  kind: z.enum(["cut", "dissolve", "fade_black", "iris"]),
  durationMs: z.number().int().min(0).max(4000),
});

export const clipSchema = z.object({
  /** References scenes.id — a scene detected inside a media item. */
  sceneId: z.string(),
  /** Trim points relative to the scene's own start. */
  inMs: z.number().int().min(0),
  outMs: z.number().int().min(0),
  speed: z.number().min(0.25).max(4).default(1),
  transitionIn: transitionSchema.optional(),
});

export const gradeSchema = z.object({
  /** A named look from the grade library, e.g. "tungsten_night". */
  look: z.string(),
  intensity: z.number().min(0).max(1).default(0.7),
});

export const musicSchema = z.object({
  /** Provider-scoped track reference, e.g. "epidemic:abc123". */
  trackRef: z.string(),
  offsetMs: z.number().int().min(0).default(0),
  duckSpeech: z.boolean().default(true),
});

export const captionSchema = z.object({
  atMs: z.number().int().min(0),
  durationMs: z.number().int().min(0),
  text: z.string(),
  /** Chapter title cards render in the display serif; dialog in sans. */
  role: z.enum(["chapter", "dialog", "credit"]),
});

export const timelineSchema = z
  .object({
    version: z.literal(EDL_VERSION),
    aspect: z.enum(["2.39", "16:9", "9:16"]).default("2.39"),
    clips: z.array(clipSchema).min(1),
    grade: gradeSchema,
    music: musicSchema.optional(),
    captions: z.array(captionSchema).default([]),
  })
  .refine(
    (t) => t.clips.every((c) => c.outMs > c.inMs),
    { message: "every clip must have outMs > inMs" },
  );

export type Transition = z.infer<typeof transitionSchema>;
export type Clip = z.infer<typeof clipSchema>;
export type Grade = z.infer<typeof gradeSchema>;
export type Music = z.infer<typeof musicSchema>;
export type Caption = z.infer<typeof captionSchema>;
export type Timeline = z.infer<typeof timelineSchema>;
