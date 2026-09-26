import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const SESSION_COOKIE = "admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

// The signing key includes the password, so changing ADMIN_PASSWORD
// immediately invalidates every existing session.
function signingKey(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const password = process.env.ADMIN_PASSWORD;
  if (!secret || secret.length < 32 || !password) {
    throw new Error("ADMIN_SESSION_SECRET (32+ chars) and ADMIN_PASSWORD must be set.");
  }
  return `${secret}:${password}`;
}

function sign(payload: string): string {
  return createHmac("sha256", signingKey()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function passwordMatches(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(input, expected);
}

export function createSessionToken(): string {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `v1.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const [version, expires, signature] = parts;
  const expiresAt = Number(expires);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return false;
  try {
    return safeEqual(signature, sign(`${version}.${expires}`));
  } catch {
    return false;
  }
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

// State-changing requests must come from this site's own pages. Combined with
// the SameSite=Strict cookie, this blocks cross-site request forgery.
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// Returns an error response if the caller is not an authenticated admin
// making a same-origin request, otherwise null.
export async function requireAdmin(request: Request): Promise<NextResponse | null> {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, error: "Bad origin." }, { status: 403 });
  }
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  return null;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown").slice(0, 64);
}
