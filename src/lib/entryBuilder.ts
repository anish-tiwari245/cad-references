// Turns admin-supplied fields into a validated library entry. Shared by
// "approve a submission" and "add a file directly" so they can't drift apart.
import { MECHANISM_TAGS } from "./constants";
import { getEntries, getThumbnail } from "./store";
import {
  cleanHttpUrl,
  cleanOptionalText,
  cleanPlatform,
  cleanProgram,
  cleanSeason,
  cleanTags,
  normalizeUrl,
} from "./validation";
import type { CadEntry, EntryKind } from "./types";

function cleanKind(value: unknown): EntryKind {
  return value === "resource" ? "resource" : "cad";
}

// Ids for files the admin adds directly. The client picks one up front so the
// Onshape thumbnail can be stored under it before the entry exists.
export const ADD_ID_RE = /^add-[a-z0-9]{6,32}$/;

type BuildResult = { ok: true; entry: CadEntry } | { ok: false; error: string; status: number };

const fail = (error: string, status = 400): BuildResult => ({ ok: false, error, status });

export async function buildEntry(
  id: string,
  body: Record<string, unknown>,
  fallbackUrl?: string,
  // excludeId: the entry being edited (it may keep its own link).
  // extraThumbnailOwners: other ids whose stored image the thumbnail may point at.
  opts: { excludeId?: string; extraThumbnailOwners?: string[] } = {}
): Promise<BuildResult> {
  const kind = cleanKind(body.kind);
  const title = cleanOptionalText(body.title, 120);
  if (!title) return fail("Title is required (120 characters max).");
  const assemblyName = cleanOptionalText(body.assemblyName, 120) ?? title;

  const url = cleanHttpUrl(body.cadUrl ?? fallbackUrl);
  const program = cleanProgram(body.program);
  const season = program ? cleanSeason(program, body.season, true) : null;
  // Resources (websites, doc galleries, spreadsheet indexes, ...) aren't a
  // mechanism, so they carry no tags and no "Full Robot"-style badge.
  const tagsInput = kind === "resource" ? [] : cleanTags(body.tags);
  const cadPlatform = cleanPlatform(body.cadPlatform);

  if (!url) return fail("CAD link is not a valid http(s) URL.");
  if (!program) return fail("Program must be FTC or FRC.");
  if (!season) return fail("Season is not valid for that program.");
  if (kind === "cad" && !tagsInput) return fail("Pick at least one valid tag.");
  if (!cadPlatform) return fail("CAD platform is not valid.");

  // Thumbnail is either the image we fetched from Onshape for this id (a
  // relative /api/thumb path) or an external http(s) URL.
  const owners = [id, ...(opts.extraThumbnailOwners ?? [])];
  const rawThumbnail = typeof body.thumbnail === "string" ? body.thumbnail.trim() : "";
  let thumbnail: string | null = null;
  if (rawThumbnail) {
    let isOwn = false;
    for (const owner of owners) {
      const prefix = ownThumbnailPrefix(owner);
      if (rawThumbnail.startsWith(prefix) && /^[0-9]+$/.test(rawThumbnail.slice(prefix.length)) && (await getThumbnail(owner))) isOwn = true;
    }
    thumbnail = isOwn ? rawThumbnail : cleanHttpUrl(rawThumbnail, 1000);
    if (!thumbnail) return fail("Thumbnail must be a valid http(s) URL.");
  }

  const primaryCategory =
    kind === "resource" ? "" : (typeof body.primaryCategory === "string" ? body.primaryCategory : tagsInput![0]);
  if (kind === "cad" && !MECHANISM_TAGS.includes(primaryCategory)) return fail("Primary category is not valid.");

  const existing = await getEntries();
  const wanted = normalizeUrl(url);
  const duplicate = existing.find((e) => e.id !== opts.excludeId && e.url && normalizeUrl(e.url) === wanted);
  if (duplicate) return fail(`That link is already in the library as "${duplicate.title}".`, 409);

  return {
    ok: true,
    entry: {
      id,
      kind,
      title,
      assemblyName,
      url,
      sourceDomain: new URL(url).hostname,
      thumbnail,
      program,
      season,
      primaryCategory,
      tags: kind === "resource" ? [] : MECHANISM_TAGS.filter((t) => t === primaryCategory || tagsInput!.includes(t)),
      cadPlatform,
      needsReview: false,
      reviewReason: null,
    },
  };
}

export const ownThumbnailPrefix = (id: string) => `/api/thumb/${id}?v=`;
