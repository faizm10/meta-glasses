import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dbCredentials: {
    // eslint-disable-next-line no-restricted-syntax
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
