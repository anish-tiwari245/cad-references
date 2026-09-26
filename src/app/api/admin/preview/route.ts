import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { ADD_ID_RE } from "@/lib/entryBuilder";
import { detectTags, parseOnshapeUrl } from "@/lib/onshape";
import { ensureThumbnail } from "@/lib/thumbnails";
import { getPendingById } from "@/lib/store";
import { cleanHttpUrl } from "@/lib/validation";

const DRAFT_THUMBNAIL_TTL_SECONDS = 24 * 60 * 60;

// Runs in the admin form for an Onshape link (a pending submission, or a file
// the admin is adding by hand): fetches the thumbnail and detects mechanisms
// from the real assembly tree. Non-Onshape links and any failure just report
// back, and the form keeps working manually.
export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== "string") {
    return NextResponse.json({ ok: false, error: "Missing id." }, { status: 400 });
  }

  const isDraft = ADD_ID_RE.test(body.id);
  let fallbackUrl: string | undefined;
  if (!isDraft) {
    const pending = await getPendingById(body.id);
    if (!pending) return NextResponse.json({ ok: false, error: "That submission no longer exists." }, { status: 404 });
    fallbackUrl = pending.cadUrl;
  }

  const url = cleanHttpUrl(body.cadUrl ?? fallbackUrl);
  const ref = url ? parseOnshapeUrl(url) : null;
  if (!ref) return NextResponse.json({ ok: true, onshape: false });

  const [thumb, detected] = await Promise.all([
    ensureThumbnail(body.id, ref, {
      force: body.force === true,
      // Nothing owns a draft's image yet, so let it expire if the form is abandoned.
      ttlSeconds: isDraft ? DRAFT_THUMBNAIL_TTL_SECONDS : undefined,
    }),
    detectTags(ref),
  ]);

  return NextResponse.json({
    ok: true,
    onshape: true,
    thumbnail: thumb.thumbnail,
    thumbnailError: thumb.error,
    tags: detected.tags,
    evidence: detected.evidence,
    tagSource: detected.source,
    tagError: detected.error,
  });
}
