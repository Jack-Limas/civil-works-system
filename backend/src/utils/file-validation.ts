import { AppError } from "./app-error";

export const MAX_SUPPORT_BYTES = 5 * 1024 * 1024;

export type SupportMime = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

/**
 * Magic-number check: the declared mimetype comes from the client and can be
 * spoofed, so the first bytes of the file must match the declared type.
 */
const SIGNATURES: Record<SupportMime, (b: Buffer) => boolean> = {
  "image/jpeg": (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": (b) => b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
  "application/pdf": (b) => b.length > 5 && b.toString("ascii", 0, 5) === "%PDF-",
};

export function assertValidSupportFile(buffer: Buffer, mimetype: string, truncated: boolean) {
  if (truncated || buffer.length > MAX_SUPPORT_BYTES) {
    throw new AppError(413, "File exceeds the 5 MB limit");
  }
  if (buffer.length === 0) throw new AppError(400, "Empty file");

  const check = SIGNATURES[mimetype as SupportMime];
  if (!check) throw new AppError(400, "Unsupported file type. Allowed: JPG, PNG, WEBP, PDF");
  if (!check(buffer)) throw new AppError(400, "File content does not match its type");
}

const IMAGE_TYPES: SupportMime[] = ["image/jpeg", "image/png", "image/webp"];

/** Evidence photos: same checks as supports, images only. */
export function assertValidImageFile(buffer: Buffer, mimetype: string, truncated: boolean) {
  if (!IMAGE_TYPES.includes(mimetype as SupportMime)) {
    throw new AppError(400, "Unsupported image type. Allowed: JPG, PNG, WEBP");
  }
  assertValidSupportFile(buffer, mimetype, truncated);
}
