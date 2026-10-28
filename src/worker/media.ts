import type { Context, Hono } from "hono";
import { displayName, HOURLY_UPLOAD_CAP, validateStoredObject, validateUpload, type MediaKind } from "../shared/limits";
import { parseByteRange } from "../shared/range";
import type { Env } from "./env";
import { canPresign, presignPut } from "./sign";
import { canViewGallery, isAdmin } from "./auth";

type AppEnv = { Bindings: Env };
type AppContext = Context<AppEnv>;

interface UploadRow {
  id: string;
  guest_name: string | null;
  table_number: number | null;
  kind: MediaKind;
  content_type: string;
  byte_size: number;
  r2_key: string;
  thumb_key: string | null;
  status: "pending" | "ready";
  hidden: number;
  created_at: string;
}

const PAGE_SIZE = 60;

async function denyGuest(c: AppContext): Promise<Response | null> {
  if (await canViewGallery(c)) return null;
  return c.json({ error: "unauthorized" }, 401);
}

export function registerMediaRoutes(app: Hono<AppEnv>) {
  app.post("/api/uploads", async (c) => {
    const denied = await denyGuest(c);
    if (denied) return denied;
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid" }, 400);
    }
    if (!body || typeof body !== "object") return c.json({ error: "invalid" }, 400);

    const recent = await c.env.DB.prepare(
      "SELECT COUNT(*) AS count FROM uploads WHERE created_at > ?",
    )
      .bind(new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .first<{ count: number }>();
    if ((recent?.count ?? 0) >= HOURLY_UPLOAD_CAP) return c.json({ error: "too_many" }, 429);

    const parsed = validateUpload(body as Record<string, unknown>);
    if (!parsed.ok) return c.json({ error: parsed.error }, 400);

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const r2Key = `media/${id}`;
    const thumbKey = parsed.value.kind === "photo" ? `thumbs/${id}.jpg` : null;

    await c.env.DB.prepare(
      `INSERT INTO uploads
        (id, guest_name, table_number, kind, content_type, byte_size, r2_key, thumb_key, status, hidden, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)`,
    )
      .bind(
        id,
        parsed.value.guestName,
        parsed.value.tableNumber,
        parsed.value.kind,
        parsed.value.contentType,
        parsed.value.byteSize,
        r2Key,
        thumbKey,
        createdAt,
      )
      .run();

    const upload = await uploadTarget(c, id, r2Key, parsed.value.contentType, "content");
    const thumb = thumbKey ? await uploadTarget(c, id, thumbKey, "image/jpeg", "thumb") : null;

    return c.json({
      id,
      createdAt,
      displayName: displayName(parsed.value.guestName),
      upload,
      thumb,
    });
  });

  app.put("/api/uploads/:id/content", (c) => receiveObject(c, "content"));
  app.put("/api/uploads/:id/thumb", (c) => receiveObject(c, "thumb"));

  app.post("/api/uploads/:id/complete", async (c) => {
    const denied = await denyGuest(c);
    if (denied) return denied;
    const row = await findUpload(c, c.req.param("id"));
    if (!row) return c.json({ error: "not_found" }, 404);
    if (row.status === "ready") return c.json({ ok: true });

    const media = await c.env.MEDIA.head(row.r2_key);
    if (!media) return c.json({ error: "invalid" }, 400);
    const mediaError = validateStoredObject(row.kind, row.content_type, media.size);
    if (mediaError) {
      await c.env.MEDIA.delete(row.r2_key);
      return c.json({ error: mediaError }, 400);
    }

    if (row.kind === "photo") {
      if (!row.thumb_key) return c.json({ error: "invalid" }, 400);
      const thumb = await c.env.MEDIA.head(row.thumb_key);
      if (!thumb || thumb.size <= 0 || thumb.size > 1024 * 1024) {
        await c.env.MEDIA.delete(row.r2_key);
        if (row.thumb_key) await c.env.MEDIA.delete(row.thumb_key);
        return c.json({ error: "invalid" }, 400);
      }
    }

    await c.env.DB.prepare(
      "UPDATE uploads SET status = 'ready', byte_size = ? WHERE id = ? AND status = 'pending'",
    )
      .bind(media.size, row.id)
      .run();

    return c.json({ ok: true, displayName: displayName(row.guest_name), createdAt: row.created_at });
  });

  app.get("/api/media", async (c) => {
    const denied = await denyGuest(c);
    if (denied) return denied;
    const cursor = decodeCursor(c.req.query("cursor"));
    const statement = cursor
      ? c.env.DB.prepare(
          `SELECT * FROM uploads
           WHERE status = 'ready' AND hidden = 0
             AND (created_at < ? OR (created_at = ? AND id < ?))
           ORDER BY created_at DESC, id DESC
           LIMIT ?`,
        ).bind(cursor.createdAt, cursor.createdAt, cursor.id, PAGE_SIZE)
      : c.env.DB.prepare(
          `SELECT * FROM uploads
           WHERE status = 'ready' AND hidden = 0
           ORDER BY created_at DESC, id DESC
           LIMIT ?`,
        ).bind(PAGE_SIZE);

    const { results } = await statement.all<UploadRow>();
    const items = results.map((row) => toPublicItem(row));
    const last = results.at(-1);
    return c.json({
      items,
      nextCursor: results.length === PAGE_SIZE && last ? encodeCursor(last) : null,
    });
  });

  app.get("/api/media/:id/file", (c) => streamMedia(c, "file"));
  app.get("/api/media/:id/thumb", (c) => streamMedia(c, "thumb"));
}

async function uploadTarget(
  c: AppContext,
  id: string,
  key: string,
  contentType: string,
  slot: "content" | "thumb",
) {
  if (canPresign(c.env)) {
    return {
      url: await presignPut(c.env, key, contentType),
      method: "PUT",
      headers: { "Content-Type": contentType },
    };
  }
  return {
    url: `/api/uploads/${id}/${slot}`,
    method: "PUT",
    headers: { "content-type": contentType },
  };
}

async function receiveObject(c: AppContext, slot: "content" | "thumb") {
  if (canPresign(c.env)) return c.json({ error: "invalid" }, 404);
  const denied = await denyGuest(c);
  if (denied) return denied;
  const row = await findUpload(c, c.req.param("id"));
  if (!row || row.status !== "pending") return c.json({ error: "not_found" }, 404);

  const key = slot === "content" ? row.r2_key : row.thumb_key;
  if (!key) return c.json({ error: "invalid" }, 400);
  const body = c.req.raw.body;
  if (!body) return c.json({ error: "invalid" }, 400);

  const contentType = slot === "thumb" ? "image/jpeg" : row.content_type;
  await c.env.MEDIA.put(key, body, { httpMetadata: { contentType } });
  return c.json({ ok: true });
}

async function streamMedia(c: AppContext, slot: "file" | "thumb") {
  const denied = await denyGuest(c);
  if (denied) return denied;
  const row = await findUpload(c, c.req.param("id"));
  if (!row || row.status !== "ready") return c.json({ error: "not_found" }, 404);
  if (row.hidden && !(await isAdmin(c))) return c.json({ error: "not_found" }, 404);

  const key = slot === "file" ? row.r2_key : row.thumb_key;
  if (!key) return c.json({ error: "not_found" }, 404);

  const head = await c.env.MEDIA.head(key);
  if (!head) return c.json({ error: "not_found" }, 404);

  const range = parseByteRange(c.req.header("range") ?? null, head.size);
  if (range === "invalid") {
    return new Response(null, {
      status: 416,
      headers: { "content-range": `bytes */${head.size}` },
    });
  }

  const object = await c.env.MEDIA.get(key, range ? { range } : undefined);
  if (!object) return c.json({ error: "not_found" }, 404);

  const headers = new Headers();
  headers.set("accept-ranges", "bytes");
  headers.set("content-type", object.httpMetadata?.contentType ?? (slot === "thumb" ? "image/jpeg" : row.content_type));
  headers.set("cache-control", "private, max-age=3600");
  headers.set("x-content-type-options", "nosniff");
  object.writeHttpMetadata(headers);

  if (range) {
    const end = range.offset + range.length - 1;
    headers.set("content-range", `bytes ${range.offset}-${end}/${head.size}`);
    headers.set("content-length", String(range.length));
    return new Response(object.body, { status: 206, headers });
  }

  headers.set("content-length", String(head.size));
  return new Response(object.body, { status: 200, headers });
}

function toPublicItem(row: UploadRow) {
  return {
    id: row.id,
    displayName: displayName(row.guest_name),
    tableNumber: row.table_number,
    kind: row.kind,
    createdAt: row.created_at,
    fileUrl: `/api/media/${row.id}/file`,
    thumbUrl: row.thumb_key ? `/api/media/${row.id}/thumb` : null,
  };
}

export function toAdminItem(row: UploadRow) {
  return { ...toPublicItem(row), hidden: row.hidden === 1 };
}

async function findUpload(c: AppContext, id: string | undefined): Promise<UploadRow | null> {
  if (!id) return null;
  return c.env.DB.prepare("SELECT * FROM uploads WHERE id = ?").bind(id).first<UploadRow>();
}

function encodeCursor(row: UploadRow): string {
  return `${row.created_at}|${row.id}`;
}

function decodeCursor(value: string | undefined): { createdAt: string; id: string } | null {
  if (!value) return null;
  const separator = value.lastIndexOf("|");
  if (separator <= 0) return null;
  const createdAt = value.slice(0, separator);
  const id = value.slice(separator + 1);
  if (!createdAt || !id) return null;
  return { createdAt, id };
}

export async function listAdminMedia(c: AppContext) {
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM uploads
     WHERE status = 'ready'
     ORDER BY created_at DESC, id DESC
     LIMIT 500`,
  ).all<UploadRow>();
  return results.map(toAdminItem);
}

export async function deleteUpload(c: AppContext, id: string | undefined): Promise<boolean> {
  const row = await findUpload(c, id);
  if (!row || row.status !== "ready") return false;
  await c.env.MEDIA.delete(row.r2_key);
  if (row.thumb_key) await c.env.MEDIA.delete(row.thumb_key);
  const result = await c.env.DB.prepare("DELETE FROM uploads WHERE id = ?").bind(row.id).run();
  return result.meta.changes > 0;
}
