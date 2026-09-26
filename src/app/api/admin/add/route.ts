import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { ADD_ID_RE, buildEntry, ownThumbnailPrefix } from "@/lib/entryBuilder";
import { addEntry, deleteThumbnail, entryExists, persistThumbnail } from "@/lib/store";

// Admin adds a file straight to the library, no submission involved.
export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== "string" || !ADD_ID_RE.test(body.id)) {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  if (await entryExists(body.id)) {
    return NextResponse.json({ ok: false, error: "That entry was already added." }, { status: 409 });
  }

  const built = await buildEntry(body.id, body);
  if (!built.ok) return NextResponse.json({ ok: false, error: built.error }, { status: built.status });

  await addEntry(built.entry);
  if (built.entry.thumbnail?.startsWith(ownThumbnailPrefix(body.id))) await persistThumbnail(body.id);
  else await deleteThumbnail(body.id);

  return NextResponse.json({ ok: true, id: built.entry.id });
}
