"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { resolveMedia } from "@auteur/contracts";

import { uploadDaily, type UploadItem } from "./upload";

/**
 * Drag-anywhere ingest + the Developing sheet (DESIGN.md §13).
 * v1 renders photo thumbnails as they "develop"; video frames arrive
 * with the pipeline in Phase 3 — until then videos develop as slates.
 */
export function IngestZone() {
  const router = useRouter();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const settledRefreshed = useRef(false);

  const update = useCallback((localId: string, patch: Partial<UploadItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.localId === localId ? { ...it, ...patch } : it)),
    );
  }, []);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fresh: UploadItem[] = [...files]
        .filter((f) => resolveMedia(f.name, f.type) !== null)
        .map((file) => ({
          localId: crypto.randomUUID(),
          file,
          phase: "fingerprinting" as const,
          progress: 0,
        }));
      if (fresh.length === 0) return;
      settledRefreshed.current = false;
      setItems((prev) => [...prev, ...fresh]);
      setOpen(true);
      for (const item of fresh) {
        void uploadDaily(item, (patch) => update(item.localId, patch));
      }
    },
    [update],
  );

  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) {
        e.preventDefault();
        setDragging(true);
      }
    };
    const onDragLeave = (e: DragEvent) => {
      if (!e.relatedTarget) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!e.dataTransfer?.files.length) return;
      e.preventDefault();
      setDragging(false);
      addFiles(e.dataTransfer.files);
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [addFiles]);

  const settled = useMemo(
    () => items.length > 0 && items.every((i) => ["developed", "duplicate", "error"].includes(i.phase)),
    [items],
  );

  useEffect(() => {
    if (settled && !settledRefreshed.current) {
      settledRefreshed.current = true;
      router.refresh(); // dailies count on the Marquee goes live
    }
  }, [settled, router]);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="video/*,image/*,audio/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => (items.length && !open ? setOpen(true) : inputRef.current?.click())}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-bone/15 bg-screen-1/80 px-5 py-2.5 text-sm text-bone/80 backdrop-blur transition-colors hover:border-bone/30 hover:text-bone"
      >
        {open || items.length === 0 ? "＋ add dailies" : "developing…"}
      </button>

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-screen-0/80 backdrop-blur-sm">
          <p className="expose font-display text-3xl text-bone">Drop your dailies.</p>
        </div>
      )}

      {open && (
        <DevelopingSheet items={items} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

const PHASE_LABEL: Record<UploadItem["phase"], string> = {
  fingerprinting: "reading",
  requesting: "slating",
  uploading: "developing",
  finishing: "fixing",
  developed: "printed",
  duplicate: "already in archive",
  error: "failed",
};

function DevelopingSheet({
  items,
  onClose,
}: {
  items: UploadItem[];
  onClose: () => void;
}) {
  const done = items.filter((i) => i.phase === "developed").length;
  return (
    <div className="expose fixed inset-x-0 bottom-0 z-50 mx-auto max-w-3xl rounded-t-2xl border border-b-0 border-bone/10 bg-screen-1/95 p-6 backdrop-blur-lg">
      <header className="mb-5 flex items-baseline justify-between">
        <h2 className="font-display text-2xl text-bone">
          {items.length} {items.length === 1 ? "daily" : "dailies"}
        </h2>
        <div className="flex items-center gap-4">
          <span className="timecode text-xs text-bone/40">
            {done}/{items.length} developed
          </span>
          <button
            type="button"
            onClick={onClose}
            className="timecode text-xs text-bone/40 transition-colors hover:text-bone"
          >
            close
          </button>
        </div>
      </header>
      <div className="grid max-h-72 grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
        {items.map((item) => (
          <ContactFrame key={item.localId} item={item} />
        ))}
      </div>
    </div>
  );
}

function ContactFrame({ item }: { item: UploadItem }) {
  const thumb = useMemo(
    () =>
      item.file.type.startsWith("image/") ? URL.createObjectURL(item.file) : null,
    [item.file],
  );
  useEffect(() => {
    return () => {
      if (thumb) URL.revokeObjectURL(thumb);
    };
  }, [thumb]);

  const developed = item.phase === "developed" || item.phase === "duplicate";

  return (
    <figure className="flex flex-col gap-1.5">
      <div className="relative aspect-video overflow-hidden rounded-md bg-screen-2">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob URL; next/image adds nothing
          <img
            src={thumb}
            alt=""
            className={`size-full object-cover transition-all duration-700 ${
              developed ? "opacity-100 blur-0" : "opacity-40 blur-md"
            }`}
          />
        ) : (
          <div
            className={`flex size-full items-center justify-center ${developed ? "" : "animate-pulse"}`}
          >
            <span className="timecode px-2 text-center text-[9px] text-bone/30">
              {item.file.name.slice(0, 24)}
            </span>
          </div>
        )}
        {item.phase === "uploading" && (
          <div
            className="absolute bottom-0 left-0 h-0.5 bg-tungsten transition-[width] duration-300"
            style={{ width: `${Math.round(item.progress * 100)}%` }}
          />
        )}
      </div>
      <figcaption
        className={`timecode text-[9px] ${
          item.phase === "error" ? "text-cut" : developed ? "text-bone/60" : "text-bone/35"
        }`}
        title={item.error}
      >
        {PHASE_LABEL[item.phase]}
        {item.phase === "error" && item.error ? ` · ${item.error.slice(0, 40)}` : ""}
      </figcaption>
    </figure>
  );
}
