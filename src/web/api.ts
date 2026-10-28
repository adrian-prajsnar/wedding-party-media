export interface WeddingConfig {
  title: string;
  date: string;
}

export interface MediaItem {
  id: string;
  displayName: string;
  tableNumber: number | null;
  kind: "photo" | "video";
  createdAt: string;
  fileUrl: string;
  thumbUrl: string | null;
  hidden?: boolean;
}

export interface UploadTarget {
  url: string;
  method: "PUT";
  headers: Record<string, string>;
}

export interface CreatedUpload {
  id: string;
  createdAt: string;
  displayName: string;
  upload: UploadTarget;
  thumb: UploadTarget | null;
}

export class ApiError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

export async function getConfig(): Promise<WeddingConfig> {
  return requestJson("/api/config");
}

export async function listMedia(cursor?: string | null): Promise<{ items: MediaItem[]; nextCursor: string | null }> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return requestJson(`/api/media${query}`);
}

export async function createUpload(input: {
  guestName: string;
  tableNumber: number | null;
  kind: "photo" | "video";
  contentType: string;
  byteSize: number;
}): Promise<CreatedUpload> {
  return requestJson("/api/uploads", {
    method: "POST",
    body: JSON.stringify({
      guestName: input.guestName,
      tableNumber: input.tableNumber,
      kind: input.kind,
      contentType: input.contentType,
      byteSize: input.byteSize,
    }),
  });
}

export function putBlob(target: UploadTarget, blob: Blob, onProgress: (ratio: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(target.method, target.url);
    for (const [name, value] of Object.entries(target.headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new ApiError("upload_failed"));
    };
    xhr.onerror = () => reject(new ApiError("upload_failed"));
    xhr.send(blob);
  });
}

export async function completeUpload(id: string): Promise<void> {
  await requestJson(`/api/uploads/${id}/complete`, { method: "POST" });
}

export async function adminSession(): Promise<boolean> {
  const response = await fetch("/api/admin/session");
  return response.ok;
}

export async function guestSession(): Promise<{ ok: boolean; required: boolean }> {
  const response = await fetch("/api/guest/session");
  if (!response.ok) return { ok: false, required: true };
  return (await response.json()) as { ok: boolean; required: boolean };
}

export async function activateGuest(token: string): Promise<void> {
  await requestJson("/api/guest/activate", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function adminEntryUrl(): Promise<{ url: string; guestRequired: boolean }> {
  return requestJson("/api/admin/entry-url");
}

export async function adminLogin(password: string): Promise<void> {
  await requestJson("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export async function adminLogout(): Promise<void> {
  await requestJson("/api/admin/logout", { method: "POST" });
}

export async function adminMedia(): Promise<MediaItem[]> {
  const payload = await requestJson<{ items: MediaItem[] }>("/api/admin/media");
  return payload.items;
}

export async function setHidden(id: string, hidden: boolean): Promise<void> {
  await requestJson(`/api/admin/media/${id}/hide`, {
    method: "POST",
    body: JSON.stringify({ hidden }),
  });
}

export async function deleteMedia(id: string): Promise<void> {
  await requestJson(`/api/admin/media/${id}`, { method: "DELETE" });
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: init?.body ? { "content-type": "application/json", ...init.headers } : init?.headers,
  });
  if (!response.ok) {
    let code = "upload_failed";
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) code = payload.error;
    } catch {
      code = "upload_failed";
    }
    throw new ApiError(code);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
