import { z } from "zod";

/**
 * The story pass output — the LLM watches the day's scene frames and
 * returns the film as structured data. Everything downstream (EDL,
 * render, film page) is deterministic from this document.
 */
export const storySchema = z.object({
  title: z.string().min(2).max(60),
  logline: z.string().min(4).max(160),
  /** One director's note: one earned praise or one craft push. */
  note: z.string().min(4).max(240),
  /** Scene whose frame becomes the one-sheet. */
  heroSceneId: z.string(),
  chapters: z
    .array(
      z.object({
        numeral: z.string().max(6),
        title: z.string().max(48),
        /** First scene of the chapter (must appear in `cut`). */
        sceneId: z.string(),
      }),
    )
    .min(1)
    .max(6),
  /** The cut, in playback order. */
  cut: z
    .array(
      z.object({
        sceneId: z.string(),
        /** How long this scene should run in the film. */
        targetMs: z.number().int().min(1500).max(15000),
      }),
    )
    .min(2)
    .max(20),
});

export type Story = z.infer<typeof storySchema>;
