// The API doesn't return a MIME/file-type field for stored files, only a
// URL — infer image vs. PDF from the extension (upload already restricts to
// jpeg/png/pdf, so this covers every real case).
export type FileKind = "image" | "pdf" | "unknown";

export function fileKindFromUrl(url: string): FileKind {
  const ext = url.split(/[?#]/)[0].split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "jpg" || ext === "jpeg" || ext === "png") return "image";
  return "unknown";
}

export function fileKindFromMime(mime: string): FileKind {
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  return "unknown";
}
