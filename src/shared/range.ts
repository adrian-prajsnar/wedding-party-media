export interface ByteRange {
  offset: number;
  length: number;
}

export function parseByteRange(header: string | null, size: number): ByteRange | "invalid" | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || size <= 0) return "invalid";

  const startText = match[1] ?? "";
  const endText = match[2] ?? "";
  if (startText === "" && endText === "") return "invalid";

  if (startText === "") {
    const suffix = Number(endText);
    if (!Number.isInteger(suffix) || suffix <= 0) return "invalid";
    const length = Math.min(suffix, size);
    return { offset: size - length, length };
  }

  const offset = Number(startText);
  if (!Number.isInteger(offset) || offset < 0 || offset >= size) return "invalid";
  const end = endText === "" ? size - 1 : Number(endText);
  if (!Number.isInteger(end) || end < offset) return "invalid";
  const last = Math.min(end, size - 1);
  return { offset, length: last - offset + 1 };
}
