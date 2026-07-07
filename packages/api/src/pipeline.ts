import {
  applyIngestResult,
  listProcessingMedia,
  markProcessing,
  setMediaStatus,
  type Media,
} from "@auteur/db";
import { ingestResultSchema, type IngestJob } from "@auteur/contracts";

/**
 * Control-plane side of the media plane (apps/pipeline/app.py).
 *
 * v1 orchestration is spawn + poll-on-read: completeUpload spawns the
 * Modal job; any page that shows media calls refreshProcessingMedia,
 * which polls Modal and applies finished results. No callbacks, so it
 * works identically on localhost and in prod. Workflow DevKit takes
 * over in Phase 4 when the pipeline becomes a multi-stage DAG.
 */

export function pipelineConfigured(): boolean {
  return Boolean(
    process.env.PIPELINE_SUBMIT_URL &&
      process.env.PIPELINE_RESULT_URL &&
      process.env.PIPELINE_SIGNING_SECRET,
  );
}

async function call(url: string, body: object): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: process.env.PIPELINE_SIGNING_SECRET, ...body }),
  });
  if (!res.ok) throw new Error(`pipeline answered ${res.status}`);
  return res.json();
}

/** Spawns ingest for a freshly uploaded daily. Returns the Modal call id. */
export async function submitIngest(m: Media): Promise<string> {
  const job: IngestJob = {
    media_id: m.id,
    kind: m.kind,
    original_key: m.originalKey,
    proxy_key: `proxies/${m.userId}/${m.id}/720.mp4`,
    poster_key: `posters/${m.userId}/${m.id}/frame.jpg`,
  };
  const out = (await call(process.env.PIPELINE_SUBMIT_URL!, { job })) as {
    status: string;
    call_id?: string;
  };
  if (out.status !== "spawned" || !out.call_id) {
    throw new Error(`pipeline submit failed: ${out.status}`);
  }
  return out.call_id;
}

/**
 * Polls Modal for every processing daily and applies finished results.
 * Cheap when nothing is processing (no rows, no requests).
 */
export async function refreshProcessingMedia(userId: string): Promise<void> {
  if (!pipelineConfigured()) return;
  const processing = await listProcessingMedia(userId);

  await Promise.all(
    processing.map(async (m) => {
      if (!m.pipelineRef) return;
      try {
        const out = (await call(process.env.PIPELINE_RESULT_URL!, {
          call_id: m.pipelineRef,
        })) as { status: string; result?: unknown; error?: string };

        if (out.status === "done") {
          const r = ingestResultSchema.parse(out.result);
          await applyIngestResult(userId, m.id, {
            durationMs: r.duration_ms,
            width: r.width,
            height: r.height,
            fps: r.fps,
            codec: r.codec,
            lat: r.lat,
            lng: r.lng,
            proxyKey: r.proxy_key ?? null,
            posterKey: r.poster_key ?? null,
          });
        } else if (out.status === "failed") {
          await setMediaStatus(userId, m.id, "failed");
        }
        // pending: leave it; the next page load polls again.
      } catch {
        // Transient pipeline/network hiccup — never break page render.
      }
    }),
  );
}
