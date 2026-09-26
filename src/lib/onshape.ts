// Server-only Onshape helpers used when approving a submission: fetch the
// document's thumbnail and detect mechanisms from its real assembly tree.
// Uses the same tagging vocabulary as the scraper (scraper/tags.mjs).
import { orderTags, tagsFromNames } from "../../scraper/tags.mjs";

const API = "https://cad.onshape.com/api/v10";
const TIMEOUT_MS = 20_000;
const THUMBNAIL_SIZE = "600x340";
const MAX_THUMBNAIL_BYTES = 600_000;

export interface OnshapeRef {
  did: string;
  wvm: "w" | "v" | "m";
  wvmId: string;
  eid: string | null;
}

export function parseOnshapeUrl(url: string): OnshapeRef | null {
  const m = url.match(/^https?:\/\/cad\.onshape\.com\/documents\/([0-9a-f]+)\/([wvm])\/([0-9a-f]+)(?:\/e\/([0-9a-f]+))?/i);
  return m ? { did: m[1], wvm: m[2] as "w" | "v" | "m", wvmId: m[3], eid: m[4] ?? null } : null;
}

function authHeader(): string | null {
  const access = process.env.ONSHAPE_ACCESS_KEY;
  const secret = process.env.ONSHAPE_SECRET_KEY;
  return access && secret ? `Basic ${Buffer.from(`${access}:${secret}`).toString("base64")}` : null;
}

class OnshapeError extends Error {}

async function onshapeGet(path: string, accept: string): Promise<Response> {
  const auth = authHeader();
  if (!auth) throw new OnshapeError("Onshape API keys are not configured.");
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      headers: { Authorization: auth, Accept: accept },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new OnshapeError("Could not reach Onshape (timed out).");
  }
  if (res.status === 429) throw new OnshapeError("Onshape rate limit hit. Try again in a minute.");
  if (res.status === 401 || res.status === 403) throw new OnshapeError("Onshape denied access to this document (it may be private).");
  if (res.status === 404) throw new OnshapeError("Onshape could not find this document.");
  return res;
}

const base = (r: OnshapeRef) => `/${r.did}/${r.wvm}/${r.wvmId}`;

// Link without an /e/ element (document-level link): use its first assembly.
async function resolveElementId(ref: OnshapeRef): Promise<string | null> {
  if (ref.eid) return ref.eid;
  const res = await onshapeGet(`/documents/d${base(ref)}/elements`, "application/json");
  if (!res.ok) return null;
  const elements = (await res.json()) as { id: string; elementType: string }[];
  return elements.find((e) => e.elementType === "ASSEMBLY")?.id ?? null;
}

export async function fetchThumbnail(
  ref: OnshapeRef
): Promise<{ ok: true; contentType: string; data: string } | { ok: false; error: string }> {
  try {
    const eid = await resolveElementId(ref);
    const path = eid
      ? `/thumbnails/d${base(ref)}/e/${eid}/s/${THUMBNAIL_SIZE}`
      : `/thumbnails/d${base(ref)}/s/${THUMBNAIL_SIZE}`;
    const res = await onshapeGet(path, "image/png");
    if (!res.ok) return { ok: false, error: `Onshape returned ${res.status} for the thumbnail.` };
    const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!contentType.startsWith("image/")) return { ok: false, error: "Onshape did not return an image." };
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_THUMBNAIL_BYTES) return { ok: false, error: "Thumbnail was empty or too large." };
    return { ok: true, contentType, data: bytes.toString("base64") };
  } catch (err) {
    return { ok: false, error: err instanceof OnshapeError ? err.message : "Thumbnail lookup failed." };
  }
}

export interface DetectedTags {
  ok: boolean;
  tags: string[];
  evidence: Record<string, string[]>;
  source: "assembly-tree" | "document-elements" | null;
  error: string | null;
}

// Same rule the scraper uses: the assembly tree describes exactly what is in
// the linked assembly, so it wins. Whole-document element names also cover
// unused or old tabs, so they are only the fallback.
export async function detectTags(ref: OnshapeRef): Promise<DetectedTags> {
  const fail = (error: string): DetectedTags => ({ ok: false, tags: [], evidence: {}, source: null, error });
  try {
    let names: string[] = [];
    let source: DetectedTags["source"] = null;

    const eid = await resolveElementId(ref);
    if (eid) {
      const query = "?includeMateFeatures=false&includeNonSolids=false&includeMateConnectors=false&excludeSuppressed=true";
      const res = await onshapeGet(`/assemblies/d${base(ref)}/e/${eid}${query}`, "application/json");
      if (res.ok) {
        const json = (await res.json()) as {
          rootAssembly?: { instances?: { name?: string }[] };
          subAssemblies?: { instances?: { name?: string }[] }[];
        };
        const found = new Set<string>();
        for (const inst of json.rootAssembly?.instances ?? []) if (inst.name) found.add(inst.name);
        for (const sub of json.subAssemblies ?? []) for (const inst of sub.instances ?? []) if (inst.name) found.add(inst.name);
        names = [...found];
        source = "assembly-tree";
      }
    }

    if (source === null) {
      const res = await onshapeGet(`/documents/d${base(ref)}/elements`, "application/json");
      if (!res.ok) return fail(`Onshape returned ${res.status} for the document.`);
      names = ((await res.json()) as { name?: string }[]).map((e) => e.name).filter((n): n is string => Boolean(n));
      source = "document-elements";
    }

    const { tags, evidence } = tagsFromNames(names);
    return {
      ok: true,
      tags: orderTags(tags),
      evidence: Object.fromEntries(Object.entries(evidence).map(([tag, list]) => [tag, list.slice(0, 5)])),
      source,
      error: null,
    };
  } catch (err) {
    return fail(err instanceof OnshapeError ? err.message : "Tag detection failed.");
  }
}
