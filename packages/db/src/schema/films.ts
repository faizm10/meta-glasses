import {
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { ulid } from "ulid";

import type { Timeline } from "@auteur/contracts";

import { users } from "./users";

export const filmKind = pgEnum("film_kind", [
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "supercut",
]);

export const filmStatus = pgEnum("film_status", [
  "drafting", // story pass running
  "rendering", // media plane at work
  "ready",
  "failed",
]);

export type FilmChapter = { numeral: string; title: string; atMs: number };

export const films = pgTable(
  "films",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: filmKind("kind").notNull().default("daily"),
    status: filmStatus("status").notNull().default("drafting"),
    title: text("title").notNull(),
    logline: text("logline"),
    /** One Director's Note for the film (full notes system is Phase 8). */
    note: text("note"),
    chapters: jsonb("chapters").$type<FilmChapter[]>().notNull().default([]),
    /** The day this film covers. */
    coversDate: date("covers_date").notNull(),
    heroFrameKey: text("hero_frame_key"),
    filmKey: text("film_key"),
    durationMs: integer("duration_ms"),
    currentVersionId: text("current_version_id"),
    pipelineRef: text("pipeline_ref"),
    premieredAt: timestamp("premiered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => [index("films_user_created_idx").on(t.userId, t.createdAt)],
);

/** Non-destructive editing: every cut is a version; the EDL is the document. */
export const filmVersions = pgTable("film_versions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => ulid()),
  filmId: text("film_id")
    .notNull()
    .references(() => films.id, { onDelete: "cascade" }),
  parentVersionId: text("parent_version_id"),
  label: text("label").notNull().default("Cut 1"),
  timeline: jsonb("timeline").$type<Timeline>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Film = typeof films.$inferSelect;
export type FilmVersion = typeof filmVersions.$inferSelect;
