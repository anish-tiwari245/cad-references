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
import type { CadEntry } from "./types";

// Ids for files the admin adds directly. The client picks one up front so the
// Onshape thumbnail can be stored under it before the entry exists.
export const ADD_ID_RE = /^add-[a-z0-9]{6,32}$/;

type BuildResult = { ok: true; entry: CadEntry } | { ok: false; error: string; status: number };

const fail = (error: string, status = 400): BuildResult => ({ ok: false, error, status });

export async function buildEntry(id: string, body: Record<string, unknown>, fallbackUrl?: string): Promise<BuildResult> {
  const title = cleanOptionalText(body.title, 120);
  if (!title) return fail("Title is required (120 characters max).");
  const assemblyName = cleanOptionalText(body.assemblyName, 120) ?? title;

  const url = cleanHttpUrl(body.cadUrl ?? fallbackUrl);
  const program = cleanProgram(body.program);
  const season = program ? cleanSeason(program, body.season) : null;
  const tagsInput = cleanTags(body.tags);
  const cadPlatform = cleanPlatform(body.cadPlatform);

  if (!url) return fail("CAD link is not a valid http(s) URL.");
  if (!program) return fail("Program must be FTC or FRC.");
  if (!season) return fail("Season is not valid for that program.");
  if (!tagsInput) return fail("Pick at least one valid tag.");
  if (!cadPlatform) return fail("CAD platform is not valid.");

  // Thumbnail is either the image we fetched from Onshape for this id (a
  // relative /api/thumb path) or an external http(s) URL.
  const ownPrefix = `/api/thumb/${id}?v=`;
  const rawThumbnail = typeof body.thumbnail === "string" ? body.thumbnail.trim() : "";
  let thumbnail: string | null = null;
  if (rawThumbnail) {
    const isOwn = rawThumbnail.startsWith(ownPrefix) && /^[0-9]+$/.test(rawThumbnail.slice(ownPrefix.length));
    thumbnail = isOwn && (await getThumbnail(id)) ? rawThumbnail : cleanHttpUrl(rawThumbnail, 1000);
    if (!thumbnail) return fail("Thumbnail must be a valid http(s) URL.");
  }

  const primaryCategory = typeof body.primaryCategory === "string" ? body.primaryCategory : tagsInput[0];
  if (!MECHANISM_TAGS.includes(primaryCategory)) return fail("Primary category is not valid.");

  const existing = await getEntries();
  const wanted = normalizeUrl(url);
  const duplicate = existing.find((e) => e.url && normalizeUrl(e.url) === wanted);
  if (duplicate) return fail(`That link is already in the library as "${duplicate.title}".`, 409);

  return {
    ok: true,
    entry: {
      id,
      title,
      assemblyName,
      url,
      sourceDomain: new URL(url).hostname,
      thumbnail,
      program,
      season,
      primaryCategory,
      tags: MECHANISM_TAGS.filter((t) => t === primaryCategory || tagsInput.includes(t)),
      cadPlatform,
      needsReview: false,
      reviewReason: null,
    },
  };
}

export const ownThumbnailPrefix = (id: string) => `/api/thumb/${id}?v=`;
