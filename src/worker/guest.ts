import type { Hono } from "hono";
import type { Env } from "./env";
import {
  canViewGallery,
  guestAccessRequired,
  guestCookieHeader,
  loginGuestCookie,
  secretTokenMatch,
} from "./auth";

type AppEnv = { Bindings: Env };

export function registerGuestRoutes(app: Hono<AppEnv>) {
  app.get("/api/guest/session", async (c) => {
    const required = guestAccessRequired(c);
    if (!required) return c.json({ ok: true, required: false });
    return c.json({ ok: await canViewGallery(c), required: true });
  });

  app.post("/api/guest/activate", async (c) => {
    if (!guestAccessRequired(c)) return c.json({ ok: true, required: false });

    let body: { token?: unknown };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid" }, 400);
    }
    const given = typeof body.token === "string" ? body.token : "";
    const expected = c.env.GUEST_ACCESS_TOKEN;
    if (!expected || !secretTokenMatch(given, expected)) {
      return c.json({ error: "unauthorized" }, 401);
    }

    const secret = c.env.COOKIE_SECRET!;
    const secure = new URL(c.req.url).protocol === "https:";
    c.header(
      "set-cookie",
      guestCookieHeader(await loginGuestCookie(secret), secure, Math.floor((30 * 24 * 60 * 60))),
    );
    return c.json({ ok: true, required: true });
  });
}
