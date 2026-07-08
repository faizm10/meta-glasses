import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  vector,
} from "drizzle-orm/pg-core";
import { ulid } from "ulid";

import { media } from "./media";

/**
 * A detected scene inside a media item — the atom films are cut from
 * (ARCHITECTURE.md §3: scenes belong to media; films reference scenes).
 * The embedding is CLIP ViT-B-32 (512-d, normalized), shared space with
 * Ask query text.
 */
export const scenes = pgTable(
  "scenes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    mediaId: text("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    idx: integer("idx").notNull(),
    startMs: integer("start_ms").notNull(),
    endMs: integer("end_ms").notNull(),
    frameKey: text("frame_key").notNull(),
    embedding: vector("embedding", { dimensions: 512 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("scenes_media_idx").on(t.mediaId, t.idx),
    index("scenes_embedding_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
  ],
);

export const transcriptSegments = pgTable(
  "transcript_segments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    mediaId: text("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    startMs: integer("start_ms").notNull(),
    endMs: integer("end_ms").notNull(),
    text: text("text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("transcript_media_idx").on(t.mediaId, t.startMs)],
);

export type Scene = typeof scenes.$inferSelect;
export type TranscriptSegment = typeof transcriptSegments.$inferSelect;
