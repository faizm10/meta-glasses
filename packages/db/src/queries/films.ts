import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";

import type { Timeline } from "@auteur/contracts";

import { db, newId } from "../client";
import {
  films,
  filmVersions,
  media,
  scenes,
  transcriptSegments,
  type Film,
  type FilmChapter,
  type Media,
  type Scene,
  type TranscriptSegment,
} from "../schema";

export type SceneWithMedia = {
  scene: Scene;
  media: Media;
  transcript: TranscriptSegment[];
};

/** The most recent calendar day (by capture time) that has ready scenes. */
export async function latestDayWithScenes(userId: string): Promise<string | null> {
  const [row] = await db()
    .select({
      day: sql<string>`to_char(coalesce(${media.capturedAt}, ${media.createdAt}), 'YYYY-MM-DD')`,
    })
    .from(scenes)
    .innerJoin(media, eq(scenes.mediaId, media.id))
    .where(and(eq(media.userId, userId), eq(media.status, "ready")))
    .orderBy(desc(sql`coalesce(${media.capturedAt}, ${media.createdAt})`))
    .limit(1);
  return row?.day ?? null;
}

/** All ready scenes captured on a given day, with transcript excerpts. */
export async function scenesForDay(
  userId: string,
  day: string,
  limit = 24,
): Promise<SceneWithMedia[]> {
  const start = new Date(`${day}T00:00:00Z`);
  const end = new Date(`${day}T23:59:59.999Z`);
  const at = sql`coalesce(${media.capturedAt}, ${media.createdAt})`;

  const rows = await db()
    .select({ scene: scenes, media: media })
    .from(scenes)
    .innerJoin(media, eq(scenes.mediaId, media.id))
    .where(
      and(
        eq(media.userId, userId),
        eq(media.status, "ready"),
        gte(at, start),
        lte(at, end),
      ),
    )
    .orderBy(at, scenes.idx)
    .limit(limit);

  if (rows.length === 0) return [];
  const mediaIds = [...new Set(rows.map((r) => r.media.id))];
  const segments = await db()
    .select()
    .from(transcriptSegments)
    .where(inArray(transcriptSegments.mediaId, mediaIds));

  return rows.map((r) => ({
    ...r,
    transcript: segments.filter(
      (s) =>
        s.mediaId === r.media.id &&
        s.startMs < r.scene.endMs &&
        s.endMs > r.scene.startMs,
    ),
  }));
}

export async function createFilmWithVersion(values: {
  userId: string;
  title: string;
  logline: string | null;
  note: string | null;
  chapters: FilmChapter[];
  coversDate: string;
  heroFrameKey: string | null;
  timeline: Timeline;
}): Promise<Film> {
  const filmId = newId();
  const versionId = newId();
  const [film] = await db()
    .insert(films)
    .values({
      id: filmId,
      userId: values.userId,
      title: values.title,
      logline: values.logline,
      note: values.note,
      chapters: values.chapters,
      coversDate: values.coversDate,
      heroFrameKey: values.heroFrameKey,
      currentVersionId: versionId,
    })
    .returning();
  await db().insert(filmVersions).values({
    id: versionId,
    filmId,
    timeline: values.timeline,
  });
  if (!film) throw new Error("film insert returned no row");
  return film;
}

export async function markFilmRendering(
  userId: string,
  filmId: string,
  pipelineRef: string,
): Promise<void> {
  await db()
    .update(films)
    .set({ status: "rendering", pipelineRef, updatedAt: new Date() })
    .where(and(eq(films.id, filmId), eq(films.userId, userId)));
}

export async function applyFilmRender(
  userId: string,
  filmId: string,
  fields: { filmKey: string; durationMs: number },
): Promise<void> {
  await db()
    .update(films)
    .set({
      ...fields,
      status: "ready",
      pipelineRef: null,
      premieredAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(films.id, filmId), eq(films.userId, userId)));
}

export async function setFilmStatus(
  userId: string,
  filmId: string,
  status: Film["status"],
): Promise<void> {
  await db()
    .update(films)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(films.id, filmId), eq(films.userId, userId)));
}

export async function listRenderingFilms(userId: string): Promise<Film[]> {
  return db()
    .select()
    .from(films)
    .where(and(eq(films.userId, userId), eq(films.status, "rendering")));
}

export async function findFilmForUser(
  userId: string,
  filmId: string,
): Promise<Film | undefined> {
  return db().query.films.findFirst({
    where: and(eq(films.id, filmId), eq(films.userId, userId)),
  });
}

export async function listFilms(userId: string, limit = 50): Promise<Film[]> {
  return db()
    .select()
    .from(films)
    .where(eq(films.userId, userId))
    .orderBy(desc(films.createdAt))
    .limit(limit);
}

export async function latestReadyFilm(userId: string): Promise<Film | undefined> {
  const [row] = await db()
    .select()
    .from(films)
    .where(and(eq(films.userId, userId), eq(films.status, "ready")))
    .orderBy(desc(films.createdAt))
    .limit(1);
  return row;
}

export async function countFilms(userId: string): Promise<number> {
  const [row] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(films)
    .where(and(eq(films.userId, userId), eq(films.status, "ready")));
  return row?.n ?? 0;
}

/** A day already drafting/rendering/premiered — don't double-cut. */
export async function findFilmForDay(
  userId: string,
  coversDate: string,
): Promise<Film | undefined> {
  return db().query.films.findFirst({
    where: and(
      eq(films.userId, userId),
      eq(films.coversDate, coversDate),
      inArray(films.status, ["drafting", "rendering", "ready"]),
    ),
  });
}
