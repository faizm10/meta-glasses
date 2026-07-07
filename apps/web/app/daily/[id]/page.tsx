import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { findMediaForUser } from "@auteur/db";
import { presignGet } from "@auteur/api";

import { ensureUser } from "@/lib/ensure-user";

/**
 * Single-daily screening. Streams the original from R2 via a presigned
 * URL (range requests work, so scrubbing does too). The 720p proxy
 * replaces the original here in Phase 3b — some browsers can't decode
 * HEVC originals, which is exactly why proxies exist.
 */
export default async function DailyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await ensureUser();
  if (!user.onboardedAt) redirect("/onboarding");

  const { id } = await params;
  const m = await findMediaForUser(user.id, id);
  if (!m || !["uploaded", "processing", "ready"].includes(m.status)) notFound();

  const srcKey = m.proxyKey ?? m.originalKey;
  const src = await presignGet(srcKey);

  const meta = [
    (m.capturedAt ?? m.createdAt).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    m.kind,
    m.width && m.height ? `${m.width}×${m.height}` : null,
    m.fps ? `${Math.round(m.fps)} fps` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="flex min-h-screen flex-col px-6 py-6">
      <header className="flex items-center justify-between">
        <Link
          href="/library"
          className="timecode text-xs text-bone/40 transition-colors hover:text-bone"
        >
          ← library
        </Link>
        <span className="timecode text-xs text-bone/40">{meta}</span>
      </header>

      <section className="flex flex-1 items-center justify-center py-8">
        <div className="w-full max-w-4xl overflow-hidden rounded-lg bg-black">
          {m.kind === "video" ? (
            <video src={src} controls playsInline className="aspect-video w-full" />
          ) : m.kind === "photo" ? (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived presigned URL
            <img src={src} alt={m.fileName ?? ""} className="w-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-6 p-16">
              <span className="timecode text-xs text-bone/40">{m.fileName}</span>
              <audio src={src} controls className="w-full" />
            </div>
          )}
        </div>
      </section>

      <footer className="flex justify-center">
        <span className="timecode text-[10px] text-bone/30">
          {m.fileName ?? "untitled"} · original — proxy playback arrives with the pipeline
        </span>
      </footer>
    </main>
  );
}
