import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { users } from "./users";

/**
 * Seeded by the onboarding taste picker (5 style stills). The AI's grade,
 * pace, and music passes read this before cutting a film. Grows later:
 * style_vector (pgvector) in Phase 4, learned biases as the models mature.
 */
export const tasteProfiles = pgTable("taste_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Slugs of the chosen onboarding stills, e.g. ["golden-hour", "noir"]. */
  pickedStills: jsonb("picked_stills").$type<string[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

export type TasteProfile = typeof tasteProfiles.$inferSelect;
