import { pgEnum, pgTable, smallint, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { ulid } from "ulid";

/** Film School progression, in crew-ladder order. */
export const userRank = pgEnum("user_rank", [
  "pa",
  "camera_op",
  "cinematographer",
  "director",
  "auteur",
]);

export const users = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    clerkId: text("clerk_id").notNull(),
    handle: text("handle"),
    displayName: text("display_name"),
    avatarKey: text("avatar_key"),
    rank: userRank("rank").notNull().default("pa"),
    /** Local hour films premiere, per the design's nightly ritual. */
    premiereHour: smallint("premiere_hour").notNull().default(21),
    timezone: text("timezone").notNull().default("UTC"),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    /** Soft delete; a purge job hard-deletes media within the promised window. */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("users_clerk_id_idx").on(t.clerkId),
    uniqueIndex("users_handle_idx").on(t.handle),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
