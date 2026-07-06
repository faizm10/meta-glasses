import { api } from "@/lib/trpc";

export type UploadPhase =
  | "fingerprinting"
  | "requesting"
  | "uploading"
  | "finishing"
  | "developed" // uploaded + verified
  | "duplicate"
  | "error";

export type UploadItem = {
  localId: string;
  file: File;
  phase: UploadPhase;
  /** 0..1, meaningful during "uploading". */
  progress: number;
  mediaId?: string;
  error?: string;
};

/**
 * Dedupe fingerprint: sha256(byte length + first 8 MiB). Cheap on any
 * file size, stable across re-imports of the same clip. Not a full
 * content hash — the pipeline can compute one server-side later.
 */
async function fingerprint(file: File): Promise<string> {
  const head = await file.slice(0, 8 * 1024 * 1024).arrayBuffer();
  const sized = new Uint8Array(head.byteLength + 8);
  new DataView(sized.buffer).setBigUint64(0, BigInt(file.size));
  sized.set(new Uint8Array(head), 8);
  const digest = await crypto.subtle.digest("SHA-256", sized);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** PUT with progress — XHR because fetch still has no upload progress. */
function putWithProgress(
  url: string,
  file: File,
  onProgress: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`storage answered ${xhr.status}`));
    xhr.onerror = () => reject(new Error("network error during upload"));
    xhr.send(file);
  });
}

export async function uploadDaily(
  item: UploadItem,
  update: (patch: Partial<UploadItem>) => void,
): Promise<void> {
  try {
    update({ phase: "fingerprinting" });
    const contentHash = await fingerprint(item.file);

    update({ phase: "requesting" });
    const begin = await api.media.beginUpload.mutate({
      fileName: item.file.name,
      mime: item.file.type || "application/octet-stream",
      bytes: item.file.size,
      contentHash,
      capturedAt: item.file.lastModified
        ? new Date(item.file.lastModified).toISOString()
        : null,
    });

    if (begin.duplicate) {
      update({ phase: "duplicate", mediaId: begin.mediaId });
      return;
    }

    update({ phase: "uploading", mediaId: begin.mediaId });
    try {
      await putWithProgress(begin.uploadUrl, item.file, (progress) =>
        update({ progress }),
      );
      update({ phase: "finishing", progress: 1 });
      await api.media.completeUpload.mutate({ mediaId: begin.mediaId });
    } catch (err) {
      await api.media.abortUpload.mutate({ mediaId: begin.mediaId }).catch(() => {});
      throw err;
    }

    update({ phase: "developed" });
  } catch (err) {
    update({
      phase: "error",
      error: err instanceof Error ? err.message : "something went wrong",
    });
  }
}
