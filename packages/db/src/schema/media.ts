import {
  bigint,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { ulid } from "ulid";

import { users } from "./users";

export const mediaKind = pgEnum("media_kind", ["video", "photo", "audio"]);

export const mediaStatus = pgEnum("media_status", [
  "registered", // row exists, no bytes yet
  "uploading",
  "uploaded", // bytes in R2, pipeline not run
  "processing", // W1 ingest workflow running
  "ready",
  "failed",
]);

export const importSource = pgEnum("import_source", [
  "browser_upload", // v1 (web-first)
  "photo_library", // mobile app, post-1.0
  "glasses_sync", // if a partner SDK ever exists
]);

/** A daily — one captured video, photo, or audio clip. */
export const media = pgTable(
  "media",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: mediaKind("kind").notNull(),
    status: mediaStatus("status").notNull().default("registered"),
    importSource: importSource("import_source").notNull().default("browser_upload"),

    fileName: text("file_name"),
    mime: text("mime").notNull(),
    bytes: bigint("bytes", { mode: "number" }).notNull(),
    /** Client fingerprint: sha256(size + first 8 MiB). Dedupes re-imports. */
    contentHash: text("content_hash").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }),

    // Probed by the pipeline (Phase 3) — null until then.
    durationMs: integer("duration_ms"),
    width: integer("width"),
    height: integer("height"),
    fps: real("fps"),
    codec: text("codec"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),

    /** Modal function-call id while status = processing. */
    pipelineRef: text("pipeline_ref"),

    // R2 object keys (content-addressed, immutable).
    originalKey: text("original_key").notNull(),
    proxyKey: text("proxy_key"),
    hlsPrefix: text("hls_prefix"),
    spriteKey: text("sprite_key"),
    posterKey: text("poster_key"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("media_user_hash_idx").on(t.userId, t.contentHash),
    index("media_user_captured_idx").on(t.userId, t.capturedAt),
  ],
);

export type Media = typeof media.$inferSelect;
