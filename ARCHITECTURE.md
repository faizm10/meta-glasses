# AUTEUR — Technical Architecture

Founding engineering document. Companion to `DESIGN.md`. Every decision here is made for a real production system with one or two engineers building it, optimizing for velocity now without foreclosing scale later.

---

## 0. Reality checks (read first)

Three constraints shape everything below. Ignoring any of them produces a hackathon demo.

**R1 — There is no raw Meta glasses SDK.** Ray-Ban Meta footage syncs through the Meta AI app into the phone's camera roll. Ingestion is therefore adapter-based, and we ship adapters in this order: **(1) browser upload** (drag dailies into the web app's Developing tray — v1, web-first), **(2) phone photo-library scan** (when the mobile app ships), **(3) a Meta partner SDK** if one ever exists. The `import_source` column and the ingest workflow are adapter-agnostic; nothing downstream knows or cares how bytes arrived.

> **Decision (2026-07-06): web-first.** The Expo app is deferred — v1 is the Next.js web app plus the Python media plane. The web app is a full product client (upload, library, playback, premiere, editing, map), not a companion. The mobile app arrives later as another tRPC client reusing every contract.

**R2 — Video compute doesn't belong on a web host.** Transcoding, scene detection, frame analysis, and final renders are long-running, CPU/GPU-heavy, FFmpeg-and-Python-shaped work. Serverless web functions are the wrong tool. We run **two planes**: a TypeScript **control plane** (API, orchestration, product logic) and a Python **media plane** (all pixel/audio work), connected by queues-of-record and webhooks.

**R3 — Bytes never pass through our API.** Originals upload from the device directly to object storage via presigned URLs; playback streams from the CDN. The API moves metadata and decisions only. This one rule is most of our scalability story.

---

## 1. System architecture

```
┌─────────────────────────── CLIENTS ────────────────────────────┐
│  Next.js web app (v1 product)      Expo app (post-1.0)          │
│  upload · library · playback ·     photo-library ingest ·       │
│  premiere · editing · map ·        same tRPC contracts          │
│  marketing · public share pages                                 │
└───────────────┬────────────────────────────┬───────────────────┘
                │ tRPC (typed) + RSC         │ tRPC (later)
┌───────────────▼────────────────────────────▼───────────────────┐
│              CONTROL PLANE — Next.js on Vercel                  │
│  tRPC routers · Clerk auth · Workflow DevKit orchestration      │
│  (ingest workflow · nightly film workflow · render workflow)    │
└───────┬──────────────────┬──────────────────────┬──────────────┘
        │ SQL              │ HTTPS + webhooks     │ AI Gateway
┌───────▼───────┐  ┌───────▼───────────────────┐  ┌──▼───────────┐
│ Neon Postgres │  │ MEDIA PLANE — Modal (Py)  │  │ LLMs/VLMs    │
│ + pgvector    │  │ probe · proxy · HLS ·     │  │ Claude ·     │
│ Drizzle ORM   │  │ scenes · frames · faces · │  │ Whisper ·    │
└───────────────┘  │ embeddings · RENDER       │  │ embeddings · │
                   └───────┬───────────────────┘  │ image gen    │
                           │                      └──────────────┘
                   ┌───────▼───────────────────┐
                   │ Cloudflare R2 + CDN       │
                   │ originals · proxies · HLS │
                   │ posters · sprites · exports│
                   └───────────────────────────┘
```

Supporting services: Clerk (auth), Mapbox (Locations), PostHog (product analytics), Sentry + Axiom (errors/logs), Expo Push + Resend (notifications/email), Stripe (later).

**Why this shape and not microservices:** two deployables (Vercel app, Modal app) is the minimum that respects R2. Everything else is a library inside the monorepo. Splitting further now buys operational cost and zero product velocity; the seams (queue-of-record between planes, adapter-based ingestion) are where we'd cut later if needed.

**Why Workflow DevKit and not a queue + cron pile:** the AI pipeline is a 10+ stage DAG per media item, plus a nightly film job that fans in over a whole day of media. We need retries with backoff, resume-after-crash, waiting hours for a render webhook without holding compute, and per-run observability. That is exactly durable execution. Steps (`"use step"`) get automatic retry and persisted results; workflows suspend on `createWebhook()` while Modal works and resume when it calls back. Hand-rolling this with BullMQ + Redis + cron is a quarter of engineering we don't spend.

**Caching:** deliberately minimal in v1. CDN caches all media (immutable, content-addressed keys). Postgres serves metadata — at our read volumes a `films` query is single-digit milliseconds; a Redis layer is premature. The one cache we do ship: Next.js data cache on public share pages. Add Upstash Redis only when a measured hot path demands it.

---

## 2. Tech stack (choices and tradeoffs)

| Layer | Choice | Why — and what we rejected |
|---|---|---|
| Web app (v1) | **Next.js (App Router) on Vercel** | The full product client and the control plane in one framework, one deploy. RSC for library/film pages, client components for playback/editing/map, OG images per film poster for share pages. |
| Mobile app (post-1.0) | **Expo (React Native)** — deferred | When it comes: reuses every tRPC contract; adds the photo-library ingestion adapter. Rejected building it first: it was the slowest path to the riskiest assumption (the first film). Rejected Swift-first for the same type-sharing reasons as before. |
| API style | **tRPC v11** (+ minimal REST for webhooks) | Both clients are TypeScript → end-to-end types with zero codegen. Rejected REST-first: schema drift between app and server is the classic two-client tax; rejected GraphQL: a federation tool for a problem we don't have. Webhooks (Modal, Clerk, Stripe) are plain route handlers. |
| Database | **Neon Postgres + pgvector** | Relational core (films↔scenes↔media is deeply relational), vectors in the same box for semantic search — no separate vector DB to sync. Neon: serverless-friendly, branching for preview envs, Vercel-native. Rejected dedicated vector DBs (Pinecone etc.) until pgvector measurably fails us (~10M+ vectors). |
| ORM | **Drizzle** | SQL-first, thin, serverless-fast, migrations as SQL we can read. Rejected Prisma: heavier runtime and an abstraction layer we'd fight in the analytical queries this product needs. |
| Object storage | **Cloudflare R2** + Cloudflare CDN | S3-compatible, **zero egress fees** — the single most important cost line in a video product. Streaming a 4-min film thousands of times from S3 bleeds money; from R2 it's free. Rejected Vercel Blob (not priced for video volume) and Mux (excellent, but we already must run FFmpeg for creative rendering — one media pipeline, owned, is simpler and far cheaper than two; Mux remains the buy-option if delivery ops ever hurt). |
| Media compute | **Modal (Python)** | Per-second billed containers, GPUs on demand, Python (the entire media/CV ecosystem: FFmpeg, PySceneDetect, insightface, librosa), deploys like serverless. Rejected: ECS/Batch (weeks of infra), Fly GPUs (more ops), Replicate (per-model, not custom-pipeline). |
| Orchestration | **Workflow DevKit** (`workflow`, `@workflow/ai`) | Durable multi-stage pipelines with retries/resume/observability, native on Vercel. See §1. |
| Auth | **Clerk** | Apple/Google sign-in matching the design's auth screen, first-class Expo + Next.js SDKs, webhooks for user lifecycle. Rejected Auth.js: we'd own token/session edge cases on mobile — undifferentiated heavy lifting. |
| AI access | **Vercel AI Gateway + AI SDK v6** | One key, provider failover, spend observability, model swapping without code churn. Claude (newest Sonnet-class via gateway) for story/notes/titles; Whisper-class model for transcription; multimodal embeddings for search; image model for posters. Model IDs live in one config module — fetched current at implementation time, never hardcoded from memory. |
| Music | **Licensed library** (Epidemic/Artlist partner API) + local audio-feature analysis | Rejected generative music for v1: rights are clean, quality is guaranteed, and "the AI picked this track because your walking pace matched 92 BPM" needs feature analysis, not generation. |
| Maps | **Mapbox GL** | The only option for the custom dark "Locations" cartography + 3D camera flights. |
| Payments | **Stripe** (Phase 12) | Default choice; subscriptions + App Store complexities handled when we get there (RevenueCat if IAP required). |
| Notifications | **Expo Push** (APNs) + **Resend** (email) | Call sheets are push-first; email only for premieres digest + account. |
| Analytics | **PostHog** | Product analytics + session replay on web + feature flags in one, already in our tooling. |
| Observability | **Sentry** (errors, both planes) + **Axiom** (structured logs) + Vercel/Modal built-ins | Cheap, fast to wire, adequate past 1.0. |
| Monorepo | **pnpm + Turborepo** | Shared types across app/web/server are the whole point of the TS-everywhere bet. |
| CI/CD | **GitHub Actions + Vercel previews + Neon branch-per-PR + EAS** | PR = preview URL + isolated DB branch + typecheck/lint/test gates. EAS Build/Update for the app; OTA updates for JS-only changes. |

---

## 3. Database schema

Postgres, Drizzle, snake_case. `id` = ULID (sortable, URL-safe). All tables: `created_at`, `updated_at`. User-owned tables: `user_id` FK + index (single-tenant rows; RLS optional later). Vectors via pgvector. Enums shown inline.

### Identity & taste

```
users             id, clerk_id UNIQUE, handle UNIQUE, display_name,
                  avatar_key, rank enum(pa|camera_op|cinematographer|director|auteur),
                  premiere_hour smallint DEFAULT 21, timezone,
                  onboarded_at, deleted_at (soft; hard-delete job purges media)

taste_profiles    user_id PK→users, style_vector vector(768),
                  picked_stills jsonb, -- onboarding: 5 chosen style stills
                  grade_bias jsonb, pace_bias real, music_genres text[]

devices           id, user_id→, kind enum(glasses|phone), label,
                  hardware_id, last_synced_at
```

### Media (the dailies) — the atom of the system

```
media             id, user_id→, device_id→, kind enum(video|photo|audio),
                  status enum(registered|uploading|uploaded|processing|ready|failed),
                  captured_at timestamptz, tz_offset,
                  duration_ms, width, height, fps, codec, bytes,
                  lat, lng (nullable), heading,
                  original_key, proxy_key, hls_prefix, sprite_key, poster_key,
                  content_hash UNIQUE(user_id, content_hash), -- dedupe re-imports
                  import_source enum(glasses_sync|photo_library|manual_upload)
                  INDEX (user_id, captured_at)

media_analysis    media_id PK→media,
                  quality_score real, sharpness real, exposure_score real,
                  stability real, lighting enum(golden|blue|overcast|indoor|night|harsh),
                  camera_motion enum(static|pan|tilt|walk|run|vehicle),
                  weather jsonb, labels text[], dominant_colors jsonb,
                  best_frame_ms int, raw jsonb  -- full model output, versioned

transcripts       id, media_id→, language, full_text, raw jsonb
transcript_segments id, transcript_id→, start_ms, end_ms, text,
                  speaker_label, embedding vector(768)

scenes            id, media_id→, idx, start_ms, end_ms,
                  title, logline,                 -- AI, nullable until analyzed
                  composition_notes jsonb, quality_score real,
                  embedding vector(768),          -- CLIP-class, drives Ask
                  best_frame_key
                  INDEX (media_id, idx); ivfflat/hnsw INDEX on embedding
```

*Why `scenes` hangs off `media`, not films:* scene detection is a property of footage. Films **reference** scenes through the timeline; ten films can reuse one scene. This split is what makes "Cut this into a film" from search a query, not a re-analysis.

### People & places

```
people            id, user_id→, name (nullable until user names them),
                  cover_face_key, is_hidden bool, blur_always bool  -- privacy first-class
face_observations id, media_id→, scene_id→, person_id→ (nullable pre-cluster),
                  embedding vector(512), bbox jsonb, at_ms
                  -- clustering assigns person_id; embeddings stay ON our infra only

places            id, user_id→, name, kind enum(home|work|city|poi|custom),
                  lat, lng, radius_m, mapbox_place_id, visit_count
media_places      media_id→, place_id→, PK(media_id, place_id)
```

### Films & editing

```
films             id, user_id→, kind enum(daily|weekly|monthly|yearly|supercut|recut),
                  status enum(drafting|developing|ready|premiered|failed),
                  title, logline, premiere_at,
                  current_version_id→film_versions,
                  poster_key, trailer_key, palette jsonb (5 swatches),
                  music_track jsonb (provider id, license ref, bpm, why),
                  source_query jsonb (for supercuts: the Ask query),
                  covers_from date, covers_to date
                  INDEX (user_id, premiere_at DESC)

film_versions     id, film_id→, parent_version_id→ (null for Cut 1),
                  label ("Cut 1", "Director's Cut"),
                  timeline jsonb NOT NULL,     -- the EDL, schema below
                  edit_source enum(ai|user_intent|user_manual),
                  intent_prompt text,          -- "make it more melancholy…"
                  render_status enum(none|proxy_ready|final_ready),
                  proxy_key, hls_prefix, duration_ms

film_chapters     id, film_id→, version_id→, idx, numeral ("II"),
                  title, start_ms, scene_id→scenes   -- queryable chapter list
```

**The EDL (`film_versions.timeline`)** is a versioned JSONB document, not rows — a timeline is edited and rendered as a whole; we never query "all clips at 00:42 across users." Zod-validated, `version` field for migrations:

```ts
{ version: 1,
  clips: [{ sceneId, in_ms, out_ms, speed, transition_in: {kind, dur_ms} }],
  grade: { look: "tungsten_night", intensity: 0.7 },
  music: { trackRef, offset_ms, duck_speech: true },
  captions: [...], aspect: "2.39" }
```

Editing history = the `parent_version_id` chain. Non-destructive by construction; "Cutting-room floor" = scenes of the source day not referenced by the current version — derived, not stored.

### Craft, notes, learning

```
director_notes    id, user_id→, film_id→, scene_id→ (nullable), at_ms,
                  kind enum(praise|push|missed_shot|technique),
                  discipline enum(composition|light|movement|story|sound),
                  body text, lesson_id→ (nullable), frame_key

craft_snapshots   id, user_id→, week date, overall real,
                  by_discipline jsonb, focus_discipline, focus_body text,
                  evidence jsonb (media/scene refs)   -- UNIQUE(user_id, week)

lessons           id, chapter enum(composition|light|color|movement|story|sound),
                  idx, title, essay_key (video), principle jsonb
lesson_progress   user_id→, lesson_id→, status enum(seen|found|shot|done),
                  user_example_scene_id→, PK(user_id, lesson_id)
```

### Collections, exports, pipeline bookkeeping

```
collections       id, user_id→, title, query jsonb (the Ask AST),
                  auto_grow bool, last_film_id→
collection_items  collection_id→, scene_id→, added_by enum(query|user)

exports           id, user_id→, film_version_id→, preset enum(social_1080|master_4k|share_hls),
                  status enum(queued|rendering|done|failed), output_key, bytes, error

pipeline_runs     id, user_id→, subject_type enum(media|film|export),
                  subject_id, workflow_run_id (DevKit id), stage, status,
                  started_at, finished_at, error jsonb
                  -- our product-side index into workflow observability
```

Analytics events go to PostHog, not Postgres. Search is `scenes.embedding` (+ `transcript_segments.embedding`) + Postgres FTS on transcripts — no separate search infra in v1.

---

## 4. The AI pipeline

Three durable workflows own everything. All heavy stages are Modal endpoints; the workflow suspends on a `createWebhook()` and resumes when Modal calls back — we never hold compute while GPUs chew.

### W1 — `ingestMedia` (per item, on upload-complete)

```
registered ▸ probe (ffprobe: duration/codec/gps/device)
          ▸ fan-out on Modal:
              proxy 720p + HLS ladder + scrub sprites + poster frame
              audio extract → transcribe (segments, speakers)
              scene detect (PySceneDetect content-aware)
          ▸ per scene: sample 3 frames → VLM batch
              (composition, lighting class, quality, labels, best-frame)
          ▸ face detect + embed (on-device-class model run server-side v1;
              embeddings never leave our storage) → incremental cluster → person_id
          ▸ geo enrich (reverse geocode → places upsert; historical weather)
          ▸ embed scenes + transcript segments (multimodal + text vectors)
          ▸ media.status = ready
```

Design notes: every step idempotent (content-hash keys, upserts); VLM calls batched per-scene-triplet not per-frame (10× cost cut); `media_analysis.raw` keeps full model output so we can re-derive columns without re-running models; a `pipeline_version` on the row lets us backfill selectively when models improve.

### W2 — `cutFilm` (nightly per user; also weekly/monthly/supercut variants)

```
gather day's ready scenes ▸ story pass (Claude):
    beats: hook / development / turn / ending
    selects scenes per beat, orders them, writes title + logline + chapters
  ▸ edit pass: EDL from story (in/out trims to best moments —
    speech boundaries + quality peaks; pace from taste_profile)
  ▸ music pass: mood + BPM match against licensed library; duck speech
  ▸ grade pass: look selection from film palette + taste
  ▸ poster pass: best-frame candidates → image model → 12-template art direction
  ▸ notes pass: director notes w/ timecodes (praise + push, evidence refs)
  ▸ render proxy on Modal (webhook) ▸ film.status = ready
  ▸ schedule premiere push at user's premiere_hour
```

The story pass is **the product**. It gets the richest context (scene loglines, transcripts, quality scores, places, people, weather, taste profile) and returns structured JSON (Zod-validated, `generateObject`-style with repair-retry). Everything downstream is deterministic from its output — which makes films reproducible and debuggable.

### W3 — `renderExport` (on demand)

EDL + originals → Modal render (FFmpeg filtergraph: trims, transitions, LUT grade, music mix, credits) → H.265/H.264 masters or HLS → webhook → export ready → push.

Failure policy: `RetryableError` for transient (rate limits, Modal cold fail), `FatalError` for permanent (corrupt file → media.failed, user sees honest state). Partial success is fine: a film can premiere even if weather enrichment failed.

---

## 5. The video pipeline (bytes only)

- **Upload:** client requests presigned **multipart** R2 URLs (`media.status=registered`) → uploads original directly (resumable, chunked, background-capable on iOS) → completes → webhook/confirm fires W1. Content-hash computed client-side pre-upload for instant dedupe.
- **Storage layout (content-addressed, immutable):**
  `originals/{userId}/{mediaId}/{hash}.mov` · `proxies/.../720.mp4` · `hls/{mediaId}/...` · `sprites/`, `posters/`, `films/{filmId}/{versionId}/...`, `exports/`
- **Playback:** HLS from R2 via CDN, signed cookies/URLs (media is private by default; share pages mint scoped tokens). Scrubbing uses sprite sheets — no video seeks for the filmstrip UI.
- **Rendering:** proxy renders (film pages, previews) on CPU containers; final 4K exports on GPU. Render is a pure function `(EDL, assets) → file`, versioned, so any cut can be re-rendered forever.
- **Retention:** originals kept (user's negatives — sacred); intermediate frames/audio are temp; proxies/HLS regenerable by policy if storage cost bites.

---

## 6. Monorepo layout

```
auteur/
├── apps/
│   ├── web/                    # Next.js — the product + control plane
│   │   ├── app/                # routes: (product)/marquee library/ film/[id]/ ask/ map/
│   │   │                       #         (marketing)/  (share)/f/[filmId]/
│   │   │                       #         api/trpc/[trpc]/  api/webhooks/{clerk,modal,stripe}/
│   │   ├── features/           # feature folders: ingest/ playback/ premiere/ cut/ ask/ map/
│   │   ├── motion/             # the motion language: beats, lens-ease, exposure
│   │   ├── ui/                 # primitives (Poster, Letterbox, GlassDock, MonoLabel)
│   │   └── workflows/          # W1 ingest / W2 cutFilm / W3 render ("use workflow")
│   │   # apps/app (Expo) joins here post-1.0
│   └── pipeline/               # Modal (Python) — the media plane
│       ├── functions/          # probe.py transcode.py scenes.py faces.py render.py
│       ├── models/             # model wrappers (scene, face, vlm client)
│       └── common/             # r2 io, callbacks, schemas mirrored from packages/contracts
├── packages/
│   ├── db/                     # Drizzle schema, migrations, query helpers — sole DB owner
│   ├── api/                    # tRPC routers + procedures (imported by web, typed into app)
│   ├── core/                   # domain logic, pure TS: EDL builder/validator, story
│   │                           #   prompt builders, palette math, craft scoring
│   ├── contracts/              # Zod schemas shared across planes: EDL, webhook payloads,
│   │                           #   pipeline stage IO  ← single source of truth for shapes
│   ├── ai/                     # AI SDK setup: gateway client, model registry, typed calls
│   └── config/                 # eslint, ts, tailwind presets
├── turbo.json  pnpm-workspace.yaml  .github/workflows/ci.yml
```

Why this shape: **features over layers** in the app (a feature folder holds its screens, hooks, state — deleting a feature is `rm -rf`); **`core` is pure** (EDL and story logic runs in tests with zero infra — this is where correctness lives); **`contracts` is the treaty** between TS and Python (Zod on one side, generated JSON Schema → Pydantic on the other, so the planes can't drift silently); **`db` is the only package that touches SQL** — routers compose queries, never write them inline.

---

## 7. API design

- **tRPC v11** at `/api/trpc`, routers per domain: `media`, `films`, `cuts`, `ask`, `people`, `places`, `notes`, `craft`, `lessons`, `collections`, `exports`, `settings`.
- **Every procedure**: Zod input, Clerk-authed context (`ctx.userId`), ownership enforced in the query (`where user_id = ctx.userId` — never trust an id from the client alone).
- **Errors**: typed domain errors (`NOT_FOUND`, `NOT_READY`, `QUOTA_EXCEEDED`, `PIPELINE_FAILED`) mapped to TRPCError codes; the app maps codes → title-card copy from the design ("The archive is unreachable. Your dailies are safe on the glasses.").
- **Mutations that kick pipelines** return `{ pipelineRunId }` immediately; clients subscribe to progress (tRPC subscription over SSE, backed by workflow run status) — this powers the Developing sheet.
- **Versioning**: tRPC is an internal contract shipped inside our own clients — versioning strategy is **additive-only changes** + EAS OTA updates keeping app JS current; breaking changes gated on minimum-app-version check at handshake. Public REST `/v1` only if/when a partner API becomes a product goal.
- **Webhooks** (REST route handlers): `/api/webhooks/modal` (HMAC-signed, resumes workflow webhooks), `/clerk` (user lifecycle), `/stripe` (later). All verified, all idempotent.

---

## 8. Roadmap to 1.0

Each phase ships something demoable and is small enough to finish before starting the next. Order is chosen so the **riskiest assumption is retired earliest**: that we can turn a camera roll into a film people feel proud of.

| Phase | Ships | Proves |
|---|---|---|
| **0. Foundation** | Monorepo, CI, Neon+Drizzle, web app boots to empty dark Marquee, Modal skeleton, deploy pipeline green | The skeleton walks |
| **1. Identity** | Clerk auth (Apple/Google), onboarding shell incl. taste picker (stored), profile | First real user row |
| **2. Ingest** | Browser upload (drag-in, multipart to R2, dedupe) → Developing sheet (real progress) | R1/R3 work end-to-end |
| **3. Dailies** | W1 minimal: probe, proxy, HLS, thumbnails; library grid; playback | We can show footage beautifully |
| **4. Understanding** | W1 full: transcription, scene detection, VLM analysis, embeddings; **Ask v1** (semantic scene search) | The archive is smart |
| **5. The First Film** ★ | W2: story pass → EDL → music → proxy render; film premieres on the Marquee | **The product moment.** Everything before serves this; everything after polishes it |
| **6. The Film Page** | Chapters, palette, cast, locations strip, end credits, share page (web) | Pride artifact complete |
| **7. The Cut** | Intent chips + freeform recut (new version via W2 edit pass), scene-card reorder, cutting-room floor | Users can direct |
| **8. The Mentor** | Director notes in W2, Your Craft weekly snapshot, notes on film pages | The teaching moat begins |
| **9. Locations** | Mapbox dark map, light points, set pages, time scrub | The dinner-party screen |
| **10. Collections & Supercuts** | Saved Asks, "Cut this into a film," auto-grow | Search that creates |
| **11. Ritual & Notify** | Premiere scheduling, call-sheet pushes, golden-hour alerts, weekly film | Retention loop |
| **12. Business** | Stripe/RevenueCat, quotas, 4K export, data export/delete | Revenue + trust |
| **1.0 Hardening** | Load/soak tests on pipeline, cost audit, on-call runbook, App Store | Ship |

Explicitly **after 1.0**: the mobile app (Expo, with photo-library ingestion), On Set live director (needs glasses audio hooks), Film School full curriculum, public profiles, Premiere Night yearly.

---

## 9. Engineering standards

- **TypeScript strict everywhere**; no `any` in `packages/*`. Python plane: pyright strict + Pydantic models generated from `contracts`.
- **Tests where correctness lives**: `core` (EDL math, story-output validation, craft scoring) at high coverage; workflow integration tests via `@workflow/vitest`; pipeline golden-file tests (fixture footage in, expected scene boundaries out). UI tested by hand + Maestro smoke flows — screenshot-testing an art-directed app is low-yield.
- **Migrations**: forward-only, reviewed SQL, never edited after merge.
- **Feature flags** (PostHog) for every user-visible AI behavior change — model swaps ship dark, compare on real footage, then flip.
- **Cost as a metric**: per-film COGS (GPU seconds, tokens, storage) tracked from Phase 5 day one on a dashboard. An AI video product that doesn't watch unit cost dies of success.
- **Docs**: each package has a one-page `README` (what it owns, what it must never do). Decisions that reverse a choice in this file get an ADR in `docs/adr/`.

---

*Next decision point: Phase 0. See repo tasks / current PR.*
