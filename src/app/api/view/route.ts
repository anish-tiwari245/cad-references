import { NextResponse } from "next/server";
import { getEntry, hitRateLimit, incrementViewCount } from "@/lib/store";
import { clientIp } from "@/lib/adminAuth";

// Public endpoint: records one view of a CAD file. The client only calls
// this once per browser per entry (see src/lib/views.ts), but it's rate
// limited per IP too since the request is easy to replay from outside the site.
const VIEWS_PER_HOUR = 120;

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return bad("Invalid JSON body.");
  }

  const id = typeof body.id === "string" ? body.id : null;
  if (!id) return bad("An id is required.");

  if (await hitRateLimit(`view:${clientIp(request)}`, VIEWS_PER_HOUR, 60 * 60)) {
    return bad("Too many requests from this connection. Try again later.", 429);
  }

  const entry = await getEntry(id);
  if (!entry || entry.kind === "resource") return bad("No CAD file with that id.", 404);

  try {
    const views = await incrementViewCount(id);
    return NextResponse.json({ ok: true, views });
  } catch (err) {
    console.error("[api/view] could not record view:", err);
    return bad("Could not record the view right now.", 503);
  }
}
