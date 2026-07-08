"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { api } from "@/lib/trpc";

type Hit = {
  sceneId: string;
  mediaId: string;
  kind: string;
  fileName: string | null;
  capturedAt: string;
  startMs: number;
  endMs: number;
  similarity: number;
  frameUrl: string;
};

const SUGGESTIONS = ["every sunset", "rainy days", "coffee", "people laughing", "the ocean"];

export function Ask() {
  const [q, setQ] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function search(query: string) {
    const text = query.trim();
    if (text.length < 2) return;
    setQ(text);
    startTransition(async () => {
      try {
        setError(null);
        const result = await api.ask.search.mutate({ q: text });
        setHits(result);
        setAsked(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : "the archive didn't answer");
      }
    });
  }

  return (
    <div className="flex w-full flex-col gap-10">
      <form
        className="flex flex-col items-center gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          search(q);
        }}
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="every sunset"
          className="w-full max-w-xl border-b border-bone/15 bg-transparent pb-3 text-center font-display text-3xl text-bone outline-none transition-colors placeholder:text-bone/20 focus:border-tungsten/60 sm:text-4xl"
        />
        <div className="flex flex-wrap items-center justify-center gap-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => search(s)}
              className="timecode text-[10px] text-bone/35 transition-colors hover:text-bone"
            >
              {s}
            </button>
          ))}
        </div>
      </form>

      {pending && (
        <p className="timecode animate-pulse text-center text-xs text-bone/40">
          searching the archive…
        </p>
      )}
      {error && <p className="timecode text-center text-xs text-cut">{error}</p>}

      {hits && !pending && (
        <section className="flex flex-col gap-5">
          <p className="timecode text-xs text-bone/40">
            {hits.length === 0
              ? `nothing in the archive matches "${asked}" yet`
              : `${hits.length} ${hits.length === 1 ? "scene" : "scenes"} · "${asked}"`}
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {hits.map((h) => (
              <Link
                key={h.sceneId}
                href={`/daily/${h.mediaId}`}
                className="group flex flex-col gap-1.5"
              >
                <div className="aspect-video overflow-hidden rounded-lg bg-screen-1 transition-transform duration-200 group-hover:scale-[1.01]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- short-lived presigned URL */}
                  <img src={h.frameUrl} alt="" className="size-full object-cover" />
                </div>
                <span className="timecode text-[10px] text-bone/40">
                  {new Date(h.capturedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                  {h.endMs > 0 && ` · ${Math.round(h.startMs / 1000)}s–${Math.round(h.endMs / 1000)}s`}
                  {` · ${Math.round(h.similarity * 100)}% match`}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
