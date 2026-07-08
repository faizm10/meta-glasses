import { and, asc, cosineDistance, eq, gt, sql } from "drizzle-orm";

import { db } from "../client";
import { media, scenes, transcriptSegments, type Media, type Scene } from "../schema";

export async function replaceScenesForMedia(
  mediaId: string,
  rows: {
    idx: number;
    startMs: number;
    endMs: number;
    frameKey: string;
    embedding: number[];
  }[],
): Promise<void> {
  await db().delete(scenes).where(eq(scenes.mediaId, mediaId));
  if (rows.length) {
    await db()
      .insert(scenes)
      .values(rows.map((r) => ({ ...r, mediaId })));
  }
}

export async function replaceTranscriptForMedia(
  mediaId: string,
  rows: { startMs: number; endMs: number; text: string }[],
): Promise<void> {
  await db().delete(transcriptSegments).where(eq(transcriptSegments.mediaId, mediaId));
  if (rows.length) {
    await db()
      .insert(transcriptSegments)
      .values(rows.map((r) => ({ ...r, mediaId })));
  }
}

export async function listScenesForMedia(mediaId: string): Promise<Scene[]> {
  return db()
    .select()
    .from(scenes)
    .where(eq(scenes.mediaId, mediaId))
    .orderBy(asc(scenes.idx));
}

/** Frame keys for storage cleanup when a daily is cut. */
export async function listSceneFrameKeys(mediaId: string): Promise<string[]> {
  const rows = await db()
    .select({ frameKey: scenes.frameKey })
    .from(scenes)
    .where(eq(scenes.mediaId, mediaId));
  return rows.map((r) => r.frameKey);
}

export type SceneHit = {
  scene: Scene;
  media: Media;
  similarity: number;
};

/**
 * Ask: cosine similarity between the CLIP query vector and every scene
 * frame the user owns. The floor keeps unrelated frames out of results
 * (CLIP similarities for true matches typically sit well above 0.2).
 */
export async function searchScenes(
  userId: string,
  queryEmbedding: number[],
  limit = 24,
): Promise<SceneHit[]> {
  const similarity = sql<number>`1 - (${cosineDistance(scenes.embedding, queryEmbedding)})`;
  const rows = await db()
    .select({ scene: scenes, media: media, similarity })
    .from(scenes)
    .innerJoin(media, eq(scenes.mediaId, media.id))
    .where(and(eq(media.userId, userId), gt(similarity, 0.2)))
    .orderBy((t) => sql`${t.similarity} desc`)
    .limit(limit);
  return rows;
}
