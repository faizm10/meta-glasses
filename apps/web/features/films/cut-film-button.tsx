"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/trpc";

/** Kicks W2 for the latest day of footage. The nightly ritual (Phase 11)
 * automates this; the button is the wow, available today. */
export function CutFilmButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function cut() {
    startTransition(async () => {
      try {
        setError(null);
        await api.films.cutLatestDay.mutate();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "the cutting room jammed");
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={cut}
        disabled={pending}
        className="rounded-full bg-tungsten px-7 py-3 text-sm font-medium text-screen-0 transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {pending ? "the editor is watching your footage…" : "cut today's film"}
      </button>
      {pending && (
        <span className="timecode text-[10px] text-bone/35">
          this takes a minute — the story is being written
        </span>
      )}
      {error && <span className="timecode text-[10px] text-cut">{error}</span>}
    </div>
  );
}
