#!/usr/bin/env bash
# Auteur — start everything.
#
# There is exactly one local process (the web app). The database (Neon)
# and the media plane (Modal) are cloud services that are always on —
# this script health-checks all of them first, so a missing key or a
# dead endpoint fails loudly here instead of mysteriously in the app.
#
#   pnpm go            # checks + dev server
#   pnpm go --skip     # skip checks, just start

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/apps/web/.env.local"

ok()   { printf "  \033[32m✓\033[0m %s\n" "$1"; }
bad()  { printf "  \033[31m✗\033[0m %s\n" "$1"; }
say()  { printf "\033[2m%s\033[0m\n" "$1"; }

if [[ "${1:-}" != "--skip" ]]; then
  say "auteur preflight"

  # 1. Env file + required keys
  if [[ ! -f "$ENV_FILE" ]]; then
    bad "apps/web/.env.local is missing — copy .env.example and fill it in"
    exit 1
  fi
  REQUIRED=(
    DATABASE_URL
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY CLERK_SECRET_KEY
    R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET
    PIPELINE_SUBMIT_URL PIPELINE_RESULT_URL PIPELINE_SIGNING_SECRET
  )
  MISSING=0
  for key in "${REQUIRED[@]}"; do
    if ! grep -qE "^${key}=." "$ENV_FILE"; then
      bad "missing $key in apps/web/.env.local"
      MISSING=1
    fi
  done
  [[ $MISSING -eq 1 ]] && exit 1
  ok "env: all ${#REQUIRED[@]} keys present"

  # 2. Dependencies
  if [[ ! -d "$ROOT/node_modules" ]]; then
    say "  installing dependencies…"
    (cd "$ROOT" && pnpm install --silent)
  fi
  ok "deps: node_modules ready"

  # 3. Database (Neon)
  if (cd "$ROOT/packages/db" && node --env-file="$ENV_FILE" --input-type=module -e "
    import { neon } from '@neondatabase/serverless';
    const rows = await neon(process.env.DATABASE_URL)\`select count(*)::int as n from users\`;
    console.error('users: ' + rows[0].n);
  " 2>&1 | sed 's/^/  · /' | grep -q "users:"); then
    ok "database: neon reachable"
  else
    bad "database: cannot reach Neon — check DATABASE_URL"
    exit 1
  fi

  # 4. Media plane (Modal) — a bad token must come back 'unauthorized',
  #    which proves the deployed endpoint is alive and checking auth.
  RESULT_URL="$(grep '^PIPELINE_RESULT_URL=' "$ENV_FILE" | cut -d= -f2-)"
  PIPELINE_ANSWER="$(curl -s --max-time 25 -X POST "$RESULT_URL" \
    -H 'content-type: application/json' \
    -d '{"token":"preflight","call_id":"preflight"}' || true)"
  if [[ "$PIPELINE_ANSWER" == *"unauthorized"* ]]; then
    ok "media plane: modal endpoints live"
  else
    bad "media plane: unexpected answer (${PIPELINE_ANSWER:-no response}) — try: pnpm pipeline:deploy"
    exit 1
  fi

  # 5. Port
  if lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
    bad "port 3000 is already in use — is another dev server running?"
    exit 1
  fi
  ok "port 3000 free"

  say ""
fi

say "▸ marquee: http://localhost:3000"
# localhost cookies are shared across every project on this machine, and
# Clerk dev sessions are large — Node's default 16KB header cap causes
# HTTP 431. 64KB absorbs a crowded localhost cookie jar.
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-http-header-size=65536"
exec pnpm --dir "$ROOT" --filter @auteur/web dev
