// Mirrors the server's limits so obvious mistakes fail before the upload.
export const ALLOWED_PRESCRIPTION_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
];
export const MAX_PRESCRIPTION_BYTES = 10 * 1024 * 1024;

export type PrescriptionFileError = "type" | "size";

export function prescriptionFileError(file: {
  type: string;
  size: number;
}): PrescriptionFileError | null {
  if (!ALLOWED_PRESCRIPTION_TYPES.includes(file.type)) return "type";
  if (file.size > MAX_PRESCRIPTION_BYTES) return "size";
  return null;
}
