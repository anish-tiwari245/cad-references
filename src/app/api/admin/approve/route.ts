import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { buildEntry, ownThumbnailPrefix } from "@/lib/entryBuilder";
import { detectTags, parseOnshapeUrl } from "@/lib/onshape";
import { ensureThumbnail } from "@/lib/thumbnails";
import { approvePending, deleteThumbnail, getPendingById } from "@/lib/store";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== "string") return bad("Missing id.");

  const pending = await getPendingById(body.id);
  if (!pending) return bad("That submission no longer exists.", 404);

  let fields: Record<string, unknown> = body;

  // One-click approval: use the submission as sent. For Onshape links, also
  // fetch the thumbnail and add any mechanisms found in the real assembly
  // tree (best effort: a failed lookup just means fewer automatic extras).
  if (body.quick === true) {
    const title = pending.title?.trim();
    if (!title) return bad("This older submission has no title. Use Review and edit to add one.");

    const tags = new Set(pending.tags);
    let thumbnail = "";
    const ref = parseOnshapeUrl(pending.cadUrl);
    if (ref) {
      const [thumb, detected] = await Promise.all([ensureThumbnail(pending.id, ref), detectTags(ref)]);
      if (thumb.thumbnail) thumbnail = thumb.thumbnail;
      for (const tag of detected.tags) tags.add(tag);
    }

    fields = {
      title,
      program: pending.program,
      season: pending.season,
      cadPlatform: pending.cadPlatform,
      cadUrl: pending.cadUrl,
      tags: [...tags],
      primaryCategory: pending.tags.includes("Full Robot") ? "Full Robot" : pending.tags[0],
      thumbnail,
    };
  }

  const built = await buildEntry(pending.id, fields, pending.cadUrl);
  if (!built.ok) return bad(built.error, built.status);

  await approvePending(pending.id, built.entry);
  // The admin swapped in a different thumbnail (or cleared it): drop the stored copy.
  if (!built.entry.thumbnail?.startsWith(ownThumbnailPrefix(pending.id))) await deleteThumbnail(pending.id);
  return NextResponse.json({ ok: true, id: built.entry.id });
}
