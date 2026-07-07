"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/trpc";

/**
 * Two-tap destructive action: first tap arms it, second tap cuts the
 * daily (row + every stored object). Arming disarms itself after a
 * beat so an abandoned first tap can't linger as a loaded gun.
 */
export function DeleteDaily({ mediaId }: { mediaId: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (!armed) {
      setArmed(true);
      setTimeout(() => setArmed(false), 4000);
      return;
    }
    startTransition(async () => {
      try {
        await api.media.remove.mutate({ mediaId });
        router.replace("/library");
        router.refresh();
      } catch {
        setError("couldn't cut it — try again");
        setArmed(false);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`timecode text-[10px] transition-colors ${
        error
          ? "text-cut"
          : armed
            ? "text-cut"
            : "text-bone/30 hover:text-cut"
      } disabled:opacity-50`}
    >
      {pending
        ? "cutting…"
        : error
          ? error
          : armed
            ? "sure? this cuts the original too"
            : "cut from archive"}
    </button>
  );
}
