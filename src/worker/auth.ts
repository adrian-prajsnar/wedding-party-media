import type { Context } from "hono";
import type { Env } from "./env";

export const ADMIN_COOKIE = "wpm_admin";
const SESSION_MS = 12 * 60 * 60 * 1000;

type AuthContext = Context<{ Bindings: Env }>;

export async function loginCookie(secret: string): Promise<string> {
  const expires = Date.now() + SESSION_MS;
  const signature = await sign(secret, String(expires));
  return `${expires}.${signature}`;
}

export async function isAdmin(c: AuthContext): Promise<boolean> {
  const secret = c.env.COOKIE_SECRET;
  if (!secret) return false;
  const token = readCookie(c.req.header("cookie"), ADMIN_COOKIE);
  if (!token) return false;
  const [expiresText, signature] = token.split(".");
  if (!expiresText || !signature) return false;
  const expires = Number(expiresText);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;
  const expected = await sign(secret, expiresText);
  return safeEqual(signature, expected);
}

export function cookieHeader(value: string, secure: boolean, maxAge: number): string {
  const parts = [
    `${ADMIN_COOKIE}=${value}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearCookieHeader(secure: boolean): string {
  return cookieHeader("", secure, 0);
}

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName === name) return rest.join("=");
  }
  return null;
}

async function sign(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return base64Url(new Uint8Array(signature));
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function safeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.byteLength !== b.byteLength) return false;
  return crypto.subtle.timingSafeEqual(a, b);
}
