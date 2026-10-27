import { describe, expect, it } from "vitest";
import {
  ANONYMOUS_NAME,
  MAX_NAME_LENGTH,
  MAX_VIDEO_BYTES,
  displayName,
  parseGuestName,
  validateUpload,
  validateVideoDuration,
  videoContentTypeForFile,
} from "./limits";
import { parseByteRange } from "./range";

describe("displayName", () => {
  it("uses Anonimowy when the name is missing", () => {
    expect(displayName(null)).toBe(ANONYMOUS_NAME);
    expect(displayName(undefined)).toBe(ANONYMOUS_NAME);
    expect(displayName("   ")).toBe(ANONYMOUS_NAME);
  });

  it("keeps a nickname or a full name", () => {
    expect(displayName("  Kasia  ")).toBe("Kasia");
    expect(displayName("Anna Nowak")).toBe("Anna Nowak");
  });
});

describe("parseGuestName", () => {
  it("treats an empty field as optional", () => {
    expect(parseGuestName(null)).toBeNull();
    expect(parseGuestName("")).toBeNull();
    expect(parseGuestName("  ")).toBeNull();
  });

  it("rejects a name longer than 40 characters", () => {
    expect(parseGuestName("a".repeat(MAX_NAME_LENGTH + 1))).toBe("name_too_long");
  });
});

describe("validateUpload", () => {
  it("accepts an anonymous photo", () => {
    const result = validateUpload({
      guestName: "  ",
      kind: "photo",
      contentType: "image/jpeg",
      byteSize: 120_000,
    });
    expect(result).toEqual({
      ok: true,
      value: {
        guestName: null,
        tableNumber: null,
        kind: "photo",
        contentType: "image/jpeg",
        byteSize: 120_000,
      },
    });
  });

  it("rejects a video over 80 MB", () => {
    const result = validateUpload({
      kind: "video",
      contentType: "video/mp4",
      byteSize: MAX_VIDEO_BYTES + 1,
    });
    expect(result).toEqual({ ok: false, error: "too_large" });
  });

  it("accepts a one-minute-sized video", () => {
    const result = validateUpload({
      guestName: "Marek",
      kind: "video",
      contentType: "video/quicktime",
      byteSize: MAX_VIDEO_BYTES,
    });
    expect(result.ok).toBe(true);
  });
});

describe("validateVideoDuration", () => {
  it("allows 60 seconds and rejects anything longer", () => {
    expect(validateVideoDuration(60)).toBeNull();
    expect(validateVideoDuration(60.04)).toBeNull();
    expect(validateVideoDuration(61)).toBe("too_long");
    expect(validateVideoDuration(Number.NaN)).toBe("invalid");
  });
});

describe("videoContentTypeForFile", () => {
  it("maps a missing phone type from the file name", () => {
    expect(videoContentTypeForFile("", "toast.MOV")).toBe("video/quicktime");
    expect(videoContentTypeForFile("video/mp4", "clip.mp4")).toBe("video/mp4");
    expect(videoContentTypeForFile("", "notes.txt")).toBeNull();
  });
});

describe("parseByteRange", () => {
  it("reads open, closed, and suffix ranges", () => {
    expect(parseByteRange(null, 100)).toBeNull();
    expect(parseByteRange("bytes=0-", 100)).toEqual({ offset: 0, length: 100 });
    expect(parseByteRange("bytes=10-19", 100)).toEqual({ offset: 10, length: 10 });
    expect(parseByteRange("bytes=-5", 100)).toEqual({ offset: 95, length: 5 });
    expect(parseByteRange("bytes=100-120", 100)).toBe("invalid");
  });
});
