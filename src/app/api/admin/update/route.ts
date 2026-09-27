import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { ADD_ID_RE, buildEntry, ownThumbnailPrefix } from "@/lib/entryBuilder";
import { deleteThumbnail, getEntry, getThumbnail, saveThumbnail, thumbnailPath, updateEntry } from "@/lib/store";

// Admin edits an existing library entry in place (its position doesn't change).
export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== "string") {
    return NextResponse.json({ ok: false, error: "Missing id." }, { status: 400 });
  }
  // The form fetches Onshape images under a throwaway draft id first.
  const draftId = typeof body.draftId === "string" && ADD_ID_RE.test(body.draftId) ? body.draftId : null;

  const existing = await getEntry(body.id);
  if (!existing) return NextResponse.json({ ok: false, error: "That entry no longer exists." }, { status: 404 });

  const built = await buildEntry(existing.id, body, existing.url ?? undefined, {
    excludeId: existing.id,
    extraThumbnailOwners: draftId ? [draftId] : [],
  });
  if (!built.ok) return NextResponse.json({ ok: false, error: built.error }, { status: built.status });

  let entry = built.entry;

  // An entry's stored image always lives under its own id, so deleting the
  // entry cleans it up. Move a freshly fetched draft image over to it.
  if (draftId && entry.thumbnail?.startsWith(ownThumbnailPrefix(draftId))) {
    const draft = await getThumbnail(draftId);
    if (draft) {
      const saved = await saveThumbnail(existing.id, { contentType: draft.contentType, data: draft.data });
      entry = { ...entry, thumbnail: thumbnailPath(existing.id, saved.v) };
    } else {
      entry = { ...entry, thumbnail: null };
    }
  } else if (!entry.thumbnail?.startsWith(ownThumbnailPrefix(existing.id))) {
    // Now an external URL or none: the stored copy is no longer used.
    await deleteThumbnail(existing.id);
  }
  if (draftId) await deleteThumbnail(draftId);

  await updateEntry(entry);
  return NextResponse.json({ ok: true, id: entry.id });
}
