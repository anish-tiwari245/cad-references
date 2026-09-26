import { fetchThumbnail, type OnshapeRef } from "./onshape";
import { getThumbnail, saveThumbnail, thumbnailPath } from "./store";

// Returns the stored thumbnail path for an id, fetching it from Onshape and
// storing our own copy if we don't have one yet (or when force is set).
export async function ensureThumbnail(
  id: string,
  ref: OnshapeRef,
  opts: { force?: boolean; ttlSeconds?: number } = {}
): Promise<{ thumbnail: string | null; error: string | null }> {
  if (!opts.force) {
    const existing = await getThumbnail(id);
    if (existing) return { thumbnail: thumbnailPath(id, existing.v), error: null };
  }
  const fetched = await fetchThumbnail(ref);
  if (!fetched.ok) return { thumbnail: null, error: fetched.error };
  const saved = await saveThumbnail(id, { contentType: fetched.contentType, data: fetched.data }, opts.ttlSeconds);
  return { thumbnail: thumbnailPath(id, saved.v), error: null };
}
