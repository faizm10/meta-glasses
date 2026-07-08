import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";

import { countDailies, countFilms, latestReadyFilm, listRenderingFilms } from "@auteur/db";
import { presignGet, refreshProcessingMedia, refreshRenderingFilms } from "@auteur/api";

import { CutFilmButton } from "@/features/films/cut-film-button";
import { IngestZone } from "@/features/ingest/ingest-zone";
import { ensureUser } from "@/lib/ensure-user";

/**
 * The Marquee — home (DESIGN.md §15). One focal point, by precedence:
 * tonight's film, a film developing, the invitation to cut one, or the
 * first-run empty state.
 */
export default async function Marquee() {
  const user = await ensureUser();
  if (!user.onboardedAt) redirect("/onboarding");
  const credit = user.displayName ? `directed by ${user.displayName}` : "directed by you";

  await Promise.all([refreshProcessingMedia(user.id), refreshRenderingFilms(user.id)]);
  const [dailies, films, premiere, rendering] = await Promise.all([
    countDailies(user.id),
    countFilms(user.id),
    latestReadyFilm(user.id),
    listRenderingFilms(user.id),
  ]);
  const heroUrl = premiere?.heroFrameKey ? await presignGet(premiere.heroFrameKey) : null;

  return (
    <main className="flex min-h-screen flex-col px-6 py-5">
      <header className="flex items-center justify-between">
        <span className="timecode text-xs text-bone/40">auteur</span>
        <div className="flex items-center gap-4">
          <Link href="/ask" className="timecode text-xs text-bone/40 transition-colors hover:text-bone">
            ask
          </Link>
          <Link href="/library" className="timecode text-xs text-bone/40 transition-colors hover:text-bone">
            library
          </Link>
          <span className="timecode text-xs text-bone/40">{credit}</span>
          <UserButton />
        </div>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-10">
        {premiere ? (
          <Link href={`/film/${premiere.id}`} className="group flex w-full max-w-2xl flex-col gap-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-screen-1 transition-transform duration-300 group-hover:scale-[1.01]">
              {heroUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- short-lived presigned URL
                <img src={heroUrl} alt="" className="size-full object-cover opacity-80" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-screen-0/90 via-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-6">
                <span className="timecode text-[10px] text-tungsten">now showing</span>
                <span className="font-display text-3xl text-bone sm:text-4xl">{premiere.title}</span>
                <span className="timecode text-[10px] text-bone/50">
                  {premiere.durationMs ? `${Math.round(premiere.durationMs / 1000)} sec · ` : ""}
                  {credit} · edited with auteur
                </span>
              </div>
            </div>
          </Link>
        ) : (
          <OpenFrame dailies={dailies} films={films} />
        )}

        <div className="flex flex-col items-center gap-5 text-center">
          {rendering.length > 0 ? (
            <>
              <h1 className="font-display text-3xl text-bone sm:text-4xl">
                Tonight’s film is developing.
              </h1>
              <p className="timecode animate-pulse text-xs text-bone/35">
                the render is underway — reload in a minute
              </p>
            </>
          ) : premiere ? (
            <CutFilmButton />
          ) : dailies > 0 ? (
            <>
              <h1 className="font-display text-4xl text-bone sm:text-5xl">
                Your dailies are in the archive.
              </h1>
              <CutFilmButton />
            </>
          ) : (
            <>
              <h1 className="font-display text-4xl font-normal tracking-tight text-bone sm:text-5xl">
                Your first film is waiting outside.
              </h1>
              <p className="timecode text-xs text-bone/35">
                shoot, then drop your footage anywhere here
              </p>
            </>
          )}
        </div>
      </section>

      <IngestZone />
    </main>
  );
}

/** The brand mark at canvas scale (DESIGN.md §3). */
function OpenFrame({ dailies, films }: { dailies: number; films: number }) {
  const w = 478;
  const h = 200;
  const tick = 28;
  return (
    <div className="relative w-full max-w-md">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Auteur open frame mark" className="w-full">
        <g stroke="var(--bone)" strokeOpacity="0.5" strokeWidth="1.5" fill="none">
          <path d={`M 1 ${tick} V 1 H ${tick}`} />
          <path d={`M ${w - tick} 1 H ${w - 1} V ${tick}`} />
          <path d={`M ${w - 1} ${h - tick} V ${h - 1} H ${w - tick}`} />
          <path d={`M ${tick} ${h - 1} H 1 V ${h - tick}`} />
        </g>
        <circle cx={w * 0.618} cy={h * 0.382} r="3.5" fill="var(--tungsten)" className="animate-pulse" />
        <g className="timecode" fill="var(--bone)" fillOpacity="0.35" fontSize="10">
          <text x={tick + 6} y={h - tick - 4}>
            dailies: {dailies}
          </text>
          <text x={w - tick - 6} y={h - tick - 4} textAnchor="end">
            films: {films}
          </text>
        </g>
      </svg>
    </div>
  );
}
