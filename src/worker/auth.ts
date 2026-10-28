import type { Context } from "hono";
import type { Env } from "./env";

export const ADMIN_COOKIE = "wpm_admin";
export const GUEST_COOKIE = "wpm_guest";
const SESSION_MS = 12 * 60 * 60 * 1000;
const GUEST_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

type AuthContext = Context<{ Bindings: Env }>;

export async function loginCookie(secret: string): Promise<string> {
  const expires = Date.now() + SESSION_MS;
  const signature = await sign(secret, String(expires));
  return `${expires}.${signature}`;
}

export async function isAdmin(c: AuthContext): Promise<boolean> {
  return hasSignedSession(c, ADMIN_COOKIE);
}

export function guestAccessRequired(c: AuthContext): boolean {
  return Boolean(c.env.GUEST_ACCESS_TOKEN && c.env.COOKIE_SECRET);
}

export async function isGuest(c: AuthContext): Promise<boolean> {
  return hasSignedSession(c, GUEST_COOKIE);
}

export async function canViewGallery(c: AuthContext): Promise<boolean> {
  if (!guestAccessRequired(c)) return true;
  if (await isAdmin(c)) return true;
  return isGuest(c);
}

export async function loginGuestCookie(secret: string): Promise<string> {
  const expires = Date.now() + GUEST_SESSION_MS;
  const signature = await sign(secret, String(expires));
  return `${expires}.${signature}`;
}

export function guestCookieHeader(value: string, secure: boolean, maxAge: number): string {
  return signedCookieHeader(GUEST_COOKIE, value, secure, maxAge);
}

export function secretTokenMatch(given: string, expected: string): boolean {
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  if (a.byteLength !== b.byteLength) return false;
  return crypto.subtle.timingSafeEqual(a, b);
}

async function hasSignedSession(c: AuthContext, cookieName: string): Promise<boolean> {
  const secret = c.env.COOKIE_SECRET;
  if (!secret) return false;
  const token = readCookie(c.req.header("cookie"), cookieName);
  if (!token) return false;
  const [expiresText, signature] = token.split(".");
  if (!expiresText || !signature) return false;
  const expires = Number(expiresText);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;
  const expected = await sign(secret, expiresText);
  return safeEqual(signature, expected);
}

export function cookieHeader(value: string, secure: boolean, maxAge: number): string {
  return signedCookieHeader(ADMIN_COOKIE, value, secure, maxAge);
}

function signedCookieHeader(name: string, value: string, secure: boolean, maxAge: number): string {
  const parts = [`${name}=${value}`, "HttpOnly", "Path=/", "SameSite=Lax", `Max-Age=${maxAge}`];
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
