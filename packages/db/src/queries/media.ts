import { and, count, desc, eq, inArray } from "drizzle-orm";

import { db } from "../client";
import { media, type Media } from "../schema";

export async function findMediaByHash(
  userId: string,
  contentHash: string,
): Promise<Media | undefined> {
  return db().query.media.findFirst({
    where: and(eq(media.userId, userId), eq(media.contentHash, contentHash)),
  });
}

export async function registerUpload(values: {
  id: string;
  userId: string;
  kind: Media["kind"];
  fileName: string | null;
  mime: string;
  bytes: number;
  contentHash: string;
  capturedAt: Date | null;
  originalKey: string;
}): Promise<Media> {
  const [row] = await db()
    .insert(media)
    .values({ ...values, status: "uploading" })
    .returning();
  if (!row) throw new Error("media insert returned no row");
  return row;
}

/** Ownership-checked single fetch. */
export async function findMediaForUser(
  userId: string,
  mediaId: string,
): Promise<Media | undefined> {
  return db().query.media.findFirst({
    where: and(eq(media.id, mediaId), eq(media.userId, userId)),
  });
}

/** Transition into the pipeline: status = processing + the Modal call id. */
export async function markProcessing(
  userId: string,
  mediaId: string,
  pipelineRef: string,
): Promise<void> {
  await db()
    .update(media)
    .set({ status: "processing", pipelineRef, updatedAt: new Date() })
    .where(and(eq(media.id, mediaId), eq(media.userId, userId)));
}

export async function listProcessingMedia(userId: string): Promise<Media[]> {
  return db()
    .select()
    .from(media)
    .where(and(eq(media.userId, userId), eq(media.status, "processing")));
}

/** Write probe results and finish the ingest stage. */
export async function applyIngestResult(
  userId: string,
  mediaId: string,
  fields: {
    durationMs: number | null;
    width: number | null;
    height: number | null;
    fps: number | null;
    codec: string | null;
    lat: number | null;
    lng: number | null;
    proxyKey: string | null;
    posterKey: string | null;
  },
): Promise<void> {
  await db()
    .update(media)
    .set({ ...fields, status: "ready", pipelineRef: null, updatedAt: new Date() })
    .where(and(eq(media.id, mediaId), eq(media.userId, userId)));
}

export async function setMediaStatus(
  userId: string,
  mediaId: string,
  status: Media["status"],
): Promise<void> {
  await db()
    .update(media)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(media.id, mediaId), eq(media.userId, userId)));
}

export async function deleteMediaRow(userId: string, mediaId: string): Promise<void> {
  await db()
    .delete(media)
    .where(and(eq(media.id, mediaId), eq(media.userId, userId)));
}

/** Dailies that made it into the archive (bytes safely in storage). */
export async function countDailies(userId: string): Promise<number> {
  const [row] = await db()
    .select({ n: count() })
    .from(media)
    .where(
      and(
        eq(media.userId, userId),
        inArray(media.status, ["uploaded", "processing", "ready"]),
      ),
    );
  return row?.n ?? 0;
}

export async function listRecentMedia(userId: string, limit = 50): Promise<Media[]> {
  return db()
    .select()
    .from(media)
    .where(eq(media.userId, userId))
    .orderBy(desc(media.createdAt))
    .limit(limit);
}
