#!/usr/bin/env node
/**
 * Mint R2 S3-compatible credentials and write apps/web/.env.local R2 vars.
 *
 * Requires a Cloudflare API token with "Account API Tokens Write" (create at
 * https://dash.cloudflare.com/profile/api-tokens). One-time setup token.
 *
 *   CLOUDFLARE_API_TOKEN=... node scripts/setup-r2-credentials.mjs
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ACCOUNT_ID = "71c377776b2b4f6f022c4468e2379d65";
const BUCKET = "auteur-media";
/** Workers R2 Storage Bucket Item Write */
const R2_WRITE_PERM = "2efd5506f9c8494dacb1fa10a3e7d5b6";

const token = process.env.CLOUDFLARE_API_TOKEN;
if (!token) {
  console.error("Set CLOUDFLARE_API_TOKEN (needs Account API Tokens Write).");
  process.exit(1);
}

const resource = `com.cloudflare.edge.r2.bucket.${ACCOUNT_ID}_default_${BUCKET}`;
const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/tokens`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: `auteur-${BUCKET}-rw`,
    policies: [
      {
        effect: "allow",
        resources: { [resource]: "*" },
        permission_groups: [{ id: R2_WRITE_PERM }],
      },
    ],
  }),
});

const data = await res.json();
if (!data.success) {
  console.error("Token creation failed:", JSON.stringify(data.errors, null, 2));
  process.exit(1);
}

const accessKeyId = data.result.id;
const secretAccessKey = createHash("sha256").update(data.result.value).digest("hex");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, "apps/web/.env.local");
const lines = existsSync(envPath) ? readFileSync(envPath, "utf8").split("\n") : [];

const set = (key, value) => {
  const i = lines.findIndex((l) => l.startsWith(`${key}=`));
  const row = `${key}=${value}`;
  if (i >= 0) lines[i] = row;
  else lines.push(row);
};

set("R2_ACCOUNT_ID", ACCOUNT_ID);
set("R2_ACCESS_KEY_ID", accessKeyId);
set("R2_SECRET_ACCESS_KEY", secretAccessKey);
set("R2_BUCKET", BUCKET);

writeFileSync(envPath, lines.filter((l, i, a) => l !== "" || i < a.length - 1).join("\n") + "\n");
console.log(`Wrote R2 credentials to ${envPath}`);
