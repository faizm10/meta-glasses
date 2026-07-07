import Link from "next/link";
import { redirect } from "next/navigation";

import { listRecentMedia, type Media } from "@auteur/db";
import { presignGet, r2Configured, refreshProcessingMedia } from "@auteur/api";

import { ensureUser } from "@/lib/ensure-user";

/**
 * The Filmography's ancestor (DESIGN.md §16). Until films exist this is
 * the dailies shelf: everything you shot, grouped by day. Poster frames
 * for videos arrive with the pipeline (Phase 3b) — photos already show.
 */
export default async function LibraryPage() {
  const user = await ensureUser();
  if (!user.onboardedAt) redirect("/onboarding");

  await refreshProcessingMedia(user.id); // collect finished pipeline runs
  const rows = await listRecentMedia(user.id, 200);
  const usable = rows.filter((m) =>
    ["uploaded", "processing", "ready"].includes(m.status),
  );

  const withThumbs = await Promise.all(
    usable.map(async (m) => ({
      media: m,
      thumbUrl: await thumbKeyFor(m),
    })),
  );

  const days = groupByDay(withThumbs);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-10 px-6 py-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="timecode text-xs text-bone/40 transition-colors hover:text-bone">
          ← marquee
        </Link>
        <span className="timecode text-xs text-bone/40">
          {usable.length} {usable.length === 1 ? "daily" : "dailies"}
        </span>
      </header>

      {days.length === 0 ? (
        <section className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="font-display text-3xl text-bone">Nothing in the archive yet.</p>
          <p className="timecode text-xs text-bone/35">drop footage on the marquee to develop it</p>
        </section>
      ) : (
        days.map(([day, items]) => (
          <section key={day} className="flex flex-col gap-4">
            <h2 className="font-display text-2xl text-bone">{day}</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {items.map(({ media: m, thumbUrl }) => (
                <DailyCard key={m.id} media={m} thumbUrl={thumbUrl} />
              ))}
            </div>
          </section>
        ))
      )}
    </main>
  );
}

async function thumbKeyFor(m: Media): Promise<string | null> {
  if (!r2Configured()) return null;
  // Pipeline poster once it exists; the original works for photos today.
  const key = m.posterKey ?? (m.kind === "photo" ? m.originalKey : null);
  return key ? presignGet(key) : null;
}

function groupByDay(
  items: { media: Media; thumbUrl: string | null }[],
): [string, { media: Media; thumbUrl: string | null }[]][] {
  const map = new Map<string, { media: Media; thumbUrl: string | null }[]>();
  for (const item of items) {
    const at = item.media.capturedAt ?? item.media.createdAt;
    const day = at.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    map.set(day, [...(map.get(day) ?? []), item]);
  }
  return [...map.entries()];
}

function DailyCard({ media: m, thumbUrl }: { media: Media; thumbUrl: string | null }) {
  const caption = [
    m.kind,
    m.durationMs ? `${Math.round(m.durationMs / 1000)}s` : null,
    formatBytes(m.bytes),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link href={`/daily/${m.id}`} className="group flex flex-col gap-1.5">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-screen-1 transition-transform duration-200 group-hover:scale-[1.01]">
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived presigned URL; the optimizer can't cache it
          <img src={thumbUrl} alt={m.fileName ?? ""} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center">
            <span className="timecode px-3 text-center text-[10px] text-bone/30">
              {m.kind === "video" ? "▸ " : ""}
              {(m.fileName ?? "untitled").slice(0, 28)}
            </span>
          </div>
        )}
      </div>
      <span className="timecode text-[10px] text-bone/40">{caption}</span>
    </Link>
  );
}

function formatBytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}gb`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}mb`;
  return `${Math.max(1, Math.round(n / 1e3))}kb`;
}
