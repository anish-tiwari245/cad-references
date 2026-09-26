import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  clientIp,
  createSessionToken,
  isSameOrigin,
  passwordMatches,
} from "@/lib/adminAuth";
import { hitRateLimit } from "@/lib/store";

const ATTEMPTS_PER_WINDOW = 8;
const WINDOW_SECONDS = 15 * 60;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, error: "Bad origin." }, { status: 403 });
  }

  if (await hitRateLimit(`login:${clientIp(request)}`, ATTEMPTS_PER_WINDOW, WINDOW_SECONDS)) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  let password = "";
  try {
    const body = await request.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (!passwordMatches(password)) {
    return NextResponse.json({ ok: false, error: "Wrong password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
