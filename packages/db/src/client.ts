import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { ulid } from "ulid";

import * as schema from "./schema";

/** Id factory — the db package owns identifier format (ULID). */
export function newId(): string {
  return ulid();
}

/**
 * Lazily-created singleton so importing the package never requires a
 * DATABASE_URL at build time — only the first query does.
 */
let _db: ReturnType<typeof createDb> | undefined;

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — see .env.example at the repo root");
  }
  return drizzle(neon(url), { schema });
}

export function db() {
  _db ??= createDb();
  return _db;
}
