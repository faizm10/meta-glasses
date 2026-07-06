import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import { ensureUser } from "@/lib/ensure-user";

/**
 * The Marquee — home. Phase 1 state: authenticated, empty (DESIGN.md §27).
 * The readouts go live in Phase 2 (ingest); the frame becomes tonight's
 * poster once the first film develops (Phase 5).
 */
export default async function Marquee() {
  const user = await ensureUser();
  if (!user.onboardedAt) redirect("/onboarding");
  const credit = user.displayName ? `directed by ${user.displayName}` : "directed by you";

  return (
    <main className="flex min-h-screen flex-col px-6 py-5">
      <header className="flex items-center justify-between">
        <span className="timecode text-xs text-bone/40">auteur</span>
        <div className="flex items-center gap-4">
          <span className="timecode text-xs text-bone/40">{credit}</span>
          <UserButton />
        </div>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-12">
        <OpenFrame />
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="font-display text-4xl font-normal tracking-tight text-bone sm:text-5xl">
            Your first film is waiting outside.
          </h1>
          <p className="timecode text-xs text-bone/35">
            dailies develop here after you shoot
          </p>
        </div>
      </section>
    </main>
  );
}

/**
 * The brand mark at canvas scale: four corner ticks of a 2.39:1 frame,
 * a point of light at the golden-ratio intersection (DESIGN.md §3).
 */
function OpenFrame() {
  const w = 478;
  const h = 200;
  const tick = 28;
  return (
    <div className="relative w-full max-w-md">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label="Auteur open frame mark"
        className="w-full"
      >
        <g stroke="var(--bone)" strokeOpacity="0.5" strokeWidth="1.5" fill="none">
          <path d={`M 1 ${tick} V 1 H ${tick}`} />
          <path d={`M ${w - tick} 1 H ${w - 1} V ${tick}`} />
          <path d={`M ${w - 1} ${h - tick} V ${h - 1} H ${w - tick}`} />
          <path d={`M ${tick} ${h - 1} H 1 V ${h - tick}`} />
        </g>
        <circle
          cx={w * 0.618}
          cy={h * 0.382}
          r="3.5"
          fill="var(--tungsten)"
          className="animate-pulse"
        />
        <g className="timecode" fill="var(--bone)" fillOpacity="0.35" fontSize="10">
          <text x={tick + 6} y={h - tick - 4}>
            dailies: 0
          </text>
          <text x={w - tick - 6} y={h - tick - 4} textAnchor="end">
            films: 0
          </text>
        </g>
      </svg>
    </div>
  );
}
