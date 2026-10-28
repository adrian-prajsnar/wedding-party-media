import type { Hono } from "hono";
import type { Env } from "./env";
import { clearCookieHeader, cookieHeader, guestAccessRequired, isAdmin, loginCookie } from "./auth";
import { deleteUpload, listAdminMedia } from "./media";

type AppEnv = { Bindings: Env };

export function registerAdminRoutes(app: Hono<AppEnv>) {
  app.post("/api/admin/login", async (c) => {
    const password = c.env.ADMIN_PASSWORD;
    const secret = c.env.COOKIE_SECRET;
    if (!password || !secret) return c.json({ error: "unauthorized" }, 401);

    let body: { password?: unknown };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid" }, 400);
    }
    const given = typeof body.password === "string" ? body.password : "";
    if (!passwordsMatch(given, password)) return c.json({ error: "unauthorized" }, 401);

    const secure = new URL(c.req.url).protocol === "https:";
    c.header("set-cookie", cookieHeader(await loginCookie(secret), secure, 12 * 60 * 60));
    return c.json({ ok: true });
  });

  app.post("/api/admin/logout", (c) => {
    const secure = new URL(c.req.url).protocol === "https:";
    c.header("set-cookie", clearCookieHeader(secure));
    return c.json({ ok: true });
  });

  app.get("/api/admin/session", async (c) => {
    if (!(await isAdmin(c))) return c.json({ error: "unauthorized" }, 401);
    return c.json({ ok: true });
  });

  app.get("/api/admin/entry-url", async (c) => {
    if (!(await isAdmin(c))) return c.json({ error: "unauthorized" }, 401);
    const origin = new URL(c.req.url).origin;
    const token = c.env.GUEST_ACCESS_TOKEN;
    if (!guestAccessRequired(c) || !token) {
      return c.json({ url: `${origin}/`, guestRequired: false });
    }
    const url = `${origin}/?access=${encodeURIComponent(token)}`;
    return c.json({ url, guestRequired: true });
  });

  app.get("/api/admin/media", async (c) => {
    if (!(await isAdmin(c))) return c.json({ error: "unauthorized" }, 401);
    return c.json({ items: await listAdminMedia(c) });
  });

  app.post("/api/admin/media/:id/hide", async (c) => {
    if (!(await isAdmin(c))) return c.json({ error: "unauthorized" }, 401);
    let body: { hidden?: unknown };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid" }, 400);
    }
    if (typeof body.hidden !== "boolean") return c.json({ error: "invalid" }, 400);

    const result = await c.env.DB.prepare(
      "UPDATE uploads SET hidden = ? WHERE id = ? AND status = 'ready'",
    )
      .bind(body.hidden ? 1 : 0, c.req.param("id"))
      .run();
    if (!result.meta.changes) return c.json({ error: "not_found" }, 404);
    return c.json({ ok: true });
  });

  app.delete("/api/admin/media/:id", async (c) => {
    if (!(await isAdmin(c))) return c.json({ error: "unauthorized" }, 401);
    const deleted = await deleteUpload(c, c.req.param("id"));
    if (!deleted) return c.json({ error: "not_found" }, 404);
    return c.json({ ok: true });
  });
}

function passwordsMatch(given: string, expected: string): boolean {
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  if (a.byteLength !== b.byteLength) return false;
  return crypto.subtle.timingSafeEqual(a, b);
}
