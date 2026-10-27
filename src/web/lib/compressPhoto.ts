import { MAX_PHOTO_BYTES, MAX_SOURCE_PHOTO_BYTES } from "../../shared/limits";

const PHOTO_EDGE = 1600;
const THUMB_EDGE = 480;

export interface CompressedPhoto {
  image: Blob;
  thumb: Blob;
}

export async function compressPhoto(file: File): Promise<CompressedPhoto> {
  if (file.size > MAX_SOURCE_PHOTO_BYTES) {
    throw new Error("source_too_big");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("unreadable");
  }

  try {
    const image = await renderJpeg(bitmap, PHOTO_EDGE, 0.72);
    const thumb = await renderJpeg(bitmap, THUMB_EDGE, 0.7);
    if (image.size > MAX_PHOTO_BYTES) throw new Error("photo_too_big");
    return { image, thumb };
  } finally {
    bitmap.close();
  }
}

async function renderJpeg(bitmap: ImageBitmap, maxEdge: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("unreadable");
  context.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });
  if (!blob) throw new Error("unreadable");
  return blob;
}
