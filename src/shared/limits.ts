export const ANONYMOUS_NAME = "Anonimowy";
export const MAX_NAME_LENGTH = 40;
export const MAX_VIDEO_SECONDS = 60;
export const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
export const MAX_SOURCE_PHOTO_BYTES = 40 * 1024 * 1024;
export const HOURLY_UPLOAD_CAP = 200;
export const MAX_TABLE_NUMBER = 500;

export const PHOTO_CONTENT_TYPES = ["image/jpeg"] as const;
export const VIDEO_CONTENT_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;

export type MediaKind = "photo" | "video";

export type ApiErrorCode =
  | "name_too_long"
  | "bad_table"
  | "bad_type"
  | "too_large"
  | "too_many"
  | "not_found"
  | "invalid"
  | "unauthorized";

export interface UploadInput {
  guestName?: unknown;
  tableNumber?: unknown;
  kind?: unknown;
  contentType?: unknown;
  byteSize?: unknown;
}

export interface ValidUpload {
  guestName: string | null;
  tableNumber: number | null;
  kind: MediaKind;
  contentType: string;
  byteSize: number;
}

export function displayName(name: string | null | undefined): string {
  const trimmed = name?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : ANONYMOUS_NAME;
}

export function parseGuestName(input: unknown): string | null | "name_too_long" | "invalid" {
  if (input == null) return null;
  if (typeof input !== "string") return "invalid";
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > MAX_NAME_LENGTH) return "name_too_long";
  return trimmed;
}

export function parseTableNumber(input: unknown): number | null | "bad_table" {
  if (input == null || input === "") return null;
  const value = typeof input === "number" ? input : typeof input === "string" ? Number(input) : Number.NaN;
  if (!Number.isInteger(value) || value < 1 || value > MAX_TABLE_NUMBER) return "bad_table";
  return value;
}

export function validateUpload(input: UploadInput): { ok: true; value: ValidUpload } | { ok: false; error: ApiErrorCode } {
  const guestName = parseGuestName(input.guestName);
  if (guestName === "name_too_long" || guestName === "invalid") {
    return { ok: false, error: guestName };
  }

  const tableNumber = parseTableNumber(input.tableNumber);
  if (tableNumber === "bad_table") return { ok: false, error: "bad_table" };

  if (input.kind !== "photo" && input.kind !== "video") return { ok: false, error: "bad_type" };
  if (typeof input.contentType !== "string") return { ok: false, error: "bad_type" };

  const byteSize = typeof input.byteSize === "number" ? input.byteSize : Number.NaN;
  const sizeError = validateStoredObject(input.kind, input.contentType, byteSize);
  if (sizeError) return { ok: false, error: sizeError };

  return {
    ok: true,
    value: {
      guestName,
      tableNumber,
      kind: input.kind,
      contentType: input.contentType,
      byteSize,
    },
  };
}

export function validateStoredObject(kind: MediaKind, contentType: string, byteSize: number): ApiErrorCode | null {
  if (!Number.isInteger(byteSize) || byteSize <= 0) return "too_large";
  if (kind === "photo") {
    if (!PHOTO_CONTENT_TYPES.includes(contentType as (typeof PHOTO_CONTENT_TYPES)[number])) return "bad_type";
    if (byteSize > MAX_PHOTO_BYTES) return "too_large";
    return null;
  }
  if (!VIDEO_CONTENT_TYPES.includes(contentType as (typeof VIDEO_CONTENT_TYPES)[number])) return "bad_type";
  if (byteSize > MAX_VIDEO_BYTES) return "too_large";
  return null;
}

export function validateVideoDuration(seconds: number): "too_long" | "invalid" | null {
  if (!Number.isFinite(seconds) || seconds <= 0) return "invalid";
  if (seconds > MAX_VIDEO_SECONDS + 0.05) return "too_long";
  return null;
}

export function videoContentTypeForFile(type: string, fileName: string): string | null {
  const normalized = type.toLowerCase();
  if (VIDEO_CONTENT_TYPES.includes(normalized as (typeof VIDEO_CONTENT_TYPES)[number])) return normalized;
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "mp4") return "video/mp4";
  if (extension === "mov") return "video/quicktime";
  if (extension === "webm") return "video/webm";
  return null;
}
