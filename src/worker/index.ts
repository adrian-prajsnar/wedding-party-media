import { Hono } from "hono";
import type { Env } from "./env";
import { registerAdminRoutes } from "./admin";
import { registerMediaRoutes } from "./media";

const app = new Hono<{ Bindings: Env }>();

app.use("*", async (c, next) => {
  await next();
  c.header("x-robots-tag", "noindex, nofollow");
});

app.get("/api/config", (c) => {
  return c.json({
    title: c.env.WEDDING_TITLE || "A & A",
    date: c.env.WEDDING_DATE || "",
  });
});

registerMediaRoutes(app);
registerAdminRoutes(app);

export default app;
