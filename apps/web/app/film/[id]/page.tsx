import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { findFilmForUser } from "@auteur/db";
import { presignGet, refreshRenderingFilms } from "@auteur/api";

import { ensureUser } from "@/lib/ensure-user";

/** The film page (DESIGN.md §17), first cut: playback, chapters,
 * the director's note, end credits. The full pride artifact
 * (palette, cast, locations) grows here in Phase 6. */
export default async function FilmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await ensureUser();
  if (!user.onboardedAt) redirect("/onboarding");

  const { id } = await params;
  await refreshRenderingFilms(user.id);
  const film = await findFilmForUser(user.id, id);
  if (!film) notFound();

  const filmUrl = film.filmKey ? await presignGet(film.filmKey) : null;
  const credit = `directed by ${user.displayName ?? "you"}`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="timecode text-xs text-bone/40 transition-colors hover:text-bone">
          ← marquee
        </Link>
        <span className="timecode text-xs text-bone/40">
          {film.coversDate} · {film.durationMs ? `${Math.round(film.durationMs / 1000)}s` : film.status}
        </span>
      </header>

      <section className="expose flex flex-col gap-2">
        <h1 className="font-display text-4xl text-bone sm:text-5xl">{film.title}</h1>
        {film.logline && <p className="text-sm text-bone/60">{film.logline}</p>}
        <p className="timecode text-[10px] text-bone/40">{credit} · edited with auteur</p>
      </section>

      {filmUrl ? (
        <div className="overflow-hidden rounded-lg bg-black">
          <video src={filmUrl} controls playsInline className="aspect-video w-full" />
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-lg bg-screen-1">
          <p className="timecode animate-pulse text-xs text-bone/40">
            {film.status === "failed"
              ? "the render failed — cut it again from the marquee"
              : "developing… reload in a minute"}
          </p>
        </div>
      )}

      {film.chapters.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="timecode text-xs text-bone/40">chapters</h2>
          <ol className="flex flex-col gap-2">
            {film.chapters.map((ch) => (
              <li key={ch.numeral} className="flex items-baseline gap-4">
                <span className="font-display text-xl text-bone/50">{ch.numeral}</span>
                <span className="text-sm text-bone">{ch.title}</span>
                <span className="timecode ml-auto text-[10px] text-bone/30">
                  {Math.floor(ch.atMs / 60000)}:{String(Math.floor((ch.atMs % 60000) / 1000)).padStart(2, "0")}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {film.note && (
        <section className="border-l-2 border-tungsten bg-screen-1 px-5 py-4">
          <p className="font-display text-base italic text-bone/85">“{film.note}”</p>
          <p className="timecode mt-2 text-[9px] text-bone/40">director’s notes</p>
        </section>
      )}

      <footer className="flex justify-center pb-4">
        <span className="timecode text-[10px] text-bone/30">
          {credit} · photographed with ray-ban · edited with auteur
        </span>
      </footer>
    </main>
  );
}
