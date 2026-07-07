/**
 * Media type resolution shared by the upload client and the API.
 *
 * Browsers frequently report an empty `File.type` for perfectly good
 * footage (.mov especially), so MIME alone can't be trusted — we fall
 * back to the extension. One definition here keeps client filtering,
 * server validation, and the R2 Content-Type in agreement.
 */

export type MediaKind = "video" | "photo" | "audio";

const EXT_MIME: Record<string, string> = {
  // video
  mov: "video/quicktime",
  mp4: "video/mp4",
  m4v: "video/x-m4v",
  webm: "video/webm",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  "3gp": "video/3gpp",
  mts: "video/mp2t",
  // photo
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  heic: "image/heic",
  heif: "image/heif",
  webp: "image/webp",
  gif: "image/gif",
  dng: "image/x-adobe-dng",
  tiff: "image/tiff",
  // audio
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  aac: "audio/aac",
  ogg: "audio/ogg",
  flac: "audio/flac",
};

export function kindFromMime(mime: string): MediaKind | null {
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "photo";
  if (mime.startsWith("audio/")) return "audio";
  return null;
}

/**
 * Returns the kind and a trustworthy MIME for a file, or null when it
 * isn't media we accept. Extension wins over a useless reported MIME.
 */
export function resolveMedia(
  fileName: string,
  reportedMime: string,
): { kind: MediaKind; mime: string } | null {
  const ext = fileName.includes(".")
    ? fileName.split(".").pop()!.toLowerCase()
    : "";
  const extMime = EXT_MIME[ext];

  const mime =
    reportedMime && kindFromMime(reportedMime)
      ? reportedMime
      : (extMime ?? reportedMime);

  const kind = kindFromMime(mime);
  return kind ? { kind, mime } : null;
}
