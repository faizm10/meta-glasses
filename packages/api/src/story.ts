import { generateText, Output } from "ai";

import {
  storySchema,
  timelineSchema,
  type Story,
  type Timeline,
} from "@auteur/contracts";
import type { SceneWithMedia } from "@auteur/db";

import { presignGet } from "./r2";

/**
 * The story pass — the product's heart (ARCHITECTURE.md W2). The model
 * is shown the actual frames of the day plus capture metadata and
 * returns the film as structured data. Model id verified against the
 * gateway's live list (2026-07-07).
 */
const STORY_MODEL = "anthropic/claude-sonnet-5";

const SYSTEM = `You are the editor at Auteur, cutting a short daily film from a
person's smart-glasses footage. You will see one representative frame per
scene, with capture times and any speech transcribed.

Rules of the cut:
- Tell a story with a hook, development, and a deliberate ending — not a
  montage in shot order (though chronology is usually your spine).
- Prefer scenes with people, light, and motion over dead pavement time.
- Total film length: aim for 45-90 seconds of footage.
- Chapters: 2-4, roman numerals, titles like a quiet art-house film.
- Title: evocative, specific to what you actually see, never generic
  ("The Rain Before Sunset", not "My Day").
- The note: speak to the director like a generous mentor — one earned,
  specific observation about their filmmaking (praise or push).
- Only reference sceneIds you were given.`;

export type StorySceneContext = {
  sceneId: string;
  frameUrl: string;
  capturedAt: Date;
  durationMs: number;
  speech: string | null;
};

export function buildSceneContexts(
  rows: SceneWithMedia[],
): Promise<StorySceneContext[]> {
  return Promise.all(
    rows.map(async (r) => ({
      sceneId: r.scene.id,
      frameUrl: await presignGet(r.scene.frameKey),
      capturedAt: r.media.capturedAt ?? r.media.createdAt,
      durationMs: r.scene.endMs - r.scene.startMs,
      speech:
        r.transcript
          .map((t) => t.text)
          .join(" ")
          .slice(0, 240) || null,
    })),
  );
}

export async function generateStory(
  scenes: StorySceneContext[],
  taste: string[] | null,
): Promise<Story> {
  const content: (
    | { type: "text"; text: string }
    | { type: "image"; image: URL }
  )[] = [
    {
      type: "text",
      text:
        `The day's scenes, in capture order.` +
        (taste?.length ? ` The director's taste: ${taste.join(", ")}.` : ""),
    },
  ];
  for (const s of scenes) {
    content.push({
      type: "text",
      text:
        `sceneId=${s.sceneId} · ${s.capturedAt.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })} · ${Math.round(s.durationMs / 1000)}s available` +
        (s.speech ? ` · speech: "${s.speech}"` : ""),
    });
    content.push({ type: "image", image: new URL(s.frameUrl) });
  }

  const result = await generateText({
    model: STORY_MODEL,
    output: Output.object({ schema: storySchema }),
    system: SYSTEM,
    messages: [{ role: "user", content }],
  });
  const story = result.output;

  const known = new Set(scenes.map((s) => s.sceneId));
  const cut = story.cut.filter((c) => known.has(c.sceneId));
  if (cut.length < 2) throw new Error("story pass referenced unknown scenes");
  return {
    ...story,
    cut,
    heroSceneId: known.has(story.heroSceneId)
      ? story.heroSceneId
      : cut[0]!.sceneId,
    chapters: story.chapters.filter((ch) => known.has(ch.sceneId)),
  };
}

/** Deterministic EDL from the story: trims each chosen scene to its
 * target length from the scene's start (speech-aware trims are a later
 * refinement), hard cuts throughout, fades handled by the renderer. */
export function buildTimeline(
  story: Story,
  rows: SceneWithMedia[],
): { timeline: Timeline; chapters: { numeral: string; title: string; atMs: number }[] } {
  const byId = new Map(rows.map((r) => [r.scene.id, r]));
  let cursor = 0;
  const atByScene = new Map<string, number>();

  const clips = story.cut.map((c) => {
    const row = byId.get(c.sceneId)!;
    const sceneLen = row.scene.endMs - row.scene.startMs;
    const len = Math.max(1500, Math.min(c.targetMs, sceneLen));
    atByScene.set(c.sceneId, cursor);
    cursor += len;
    return {
      sceneId: c.sceneId,
      inMs: row.scene.startMs,
      outMs: row.scene.startMs + len,
      speed: 1,
    };
  });

  const chapters = story.chapters
    .filter((ch) => atByScene.has(ch.sceneId))
    .map((ch) => ({
      numeral: ch.numeral,
      title: ch.title,
      atMs: atByScene.get(ch.sceneId)!,
    }));

  const timeline = timelineSchema.parse({
    version: 1,
    aspect: "16:9",
    clips,
    grade: { look: "natural", intensity: 0.5 },
    captions: chapters.map((ch) => ({
      atMs: ch.atMs,
      durationMs: 2000,
      text: `${ch.numeral}. ${ch.title}`,
      role: "chapter" as const,
    })),
  });

  return { timeline, chapters };
}
