"use client";

import { useEffect, useState, useTransition } from "react";

import { completeOnboarding } from "./actions";
import { PICK_COUNT, STYLE_STILLS, type StyleStill } from "./styles";

/**
 * The cold open (DESIGN.md §11): three title cards, then the taste
 * picker. Cards auto-advance on the hero beat; a click skips ahead.
 */
const TITLE_CARDS = [
  "Every day, you shoot hours of footage.",
  "You just don't have a cinematographer.",
  "Now you do.",
];

const CARD_MS = 2600;

export function Onboarding() {
  const [step, setStep] = useState(0);
  const picking = step >= TITLE_CARDS.length;

  useEffect(() => {
    if (picking) return;
    const t = setTimeout(() => setStep((s) => s + 1), CARD_MS);
    return () => clearTimeout(t);
  }, [step, picking]);

  if (!picking) {
    return (
      <button
        type="button"
        onClick={() => setStep((s) => s + 1)}
        className="flex min-h-screen w-full cursor-pointer flex-col items-center justify-center px-8"
        aria-label="Continue"
      >
        <p key={step} className="expose font-display text-3xl text-bone sm:text-5xl">
          {TITLE_CARDS[step]}
        </p>
      </button>
    );
  }

  return <TastePicker />;
}

function TastePicker() {
  const [picked, setPicked] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const full = picked.length === PICK_COUNT;

  function toggle(slug: string) {
    setPicked((p) =>
      p.includes(slug) ? p.filter((s) => s !== slug) : full ? p : [...p, slug],
    );
  }

  return (
    <main className="expose mx-auto flex min-h-screen max-w-3xl flex-col gap-10 px-6 py-14">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-3xl text-bone sm:text-4xl">
          Pick the five that feel like you.
        </h1>
        <p className="timecode text-xs text-bone/40">
          this seeds your grade, pace, and music · change it anytime
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {STYLE_STILLS.map((still) => (
          <StillCard
            key={still.slug}
            still={still}
            selected={picked.includes(still.slug)}
            dimmed={full && !picked.includes(still.slug)}
            onToggle={() => toggle(still.slug)}
          />
        ))}
      </div>

      <footer className="sticky bottom-6 flex items-center justify-between rounded-2xl border border-bone/10 bg-screen-1/80 px-5 py-4 backdrop-blur">
        <span className="timecode text-xs text-bone/40">
          {picked.length} / {PICK_COUNT} selected
        </span>
        <button
          type="button"
          disabled={!full || pending}
          onClick={() => startTransition(() => completeOnboarding(picked))}
          className="rounded-full bg-tungsten px-6 py-2.5 text-sm font-medium text-screen-0 transition-opacity disabled:opacity-30"
        >
          {pending ? "Developing…" : "Begin"}
        </button>
      </footer>
    </main>
  );
}

function StillCard({
  still,
  selected,
  dimmed,
  onToggle,
}: {
  still: StyleStill;
  selected: boolean;
  dimmed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`group flex flex-col gap-2 text-left transition-opacity duration-200 ${
        dimmed ? "opacity-35" : "opacity-100"
      }`}
    >
      <div
        className="relative aspect-[2.39/1] w-full overflow-hidden rounded-lg transition-transform duration-200 group-active:scale-[0.98]"
        style={{
          boxShadow: selected
            ? "0 0 0 1.5px var(--tungsten)"
            : "0 0 0 1px rgba(242, 239, 233, 0.1)",
        }}
      >
        {still.bands.map((band, i) => (
          <div key={i} style={{ background: band.color, height: `${band.height}%` }} />
        ))}
        {still.light && (
          <span
            className="absolute size-2.5 rounded-full"
            style={{
              left: `${still.light.x}%`,
              top: `${still.light.y}%`,
              background: still.light.color,
            }}
          />
        )}
        {selected && <FrameTicks />}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-bone">{still.name}</span>
        <span className="timecode text-[10px] text-bone/35">{still.note}</span>
      </div>
    </button>
  );
}

/** Viewfinder corner ticks — the selection state is "you framed it". */
function FrameTicks() {
  const c = "absolute size-3 border-tungsten";
  return (
    <>
      <span className={`${c} left-1.5 top-1.5 border-l-[1.5px] border-t-[1.5px]`} />
      <span className={`${c} right-1.5 top-1.5 border-r-[1.5px] border-t-[1.5px]`} />
      <span className={`${c} bottom-1.5 right-1.5 border-b-[1.5px] border-r-[1.5px]`} />
      <span className={`${c} bottom-1.5 left-1.5 border-b-[1.5px] border-l-[1.5px]`} />
    </>
  );
}
