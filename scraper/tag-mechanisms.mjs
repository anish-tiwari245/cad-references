// Tags Onshape CAD entries with the mechanisms found inside the actual document.
//
// Two sources of part names per Onshape link:
//   1. Element list (GET /documents/d/{did}/{wvm}/{id}/elements). Public docs
//      answer this WITHOUT authentication. Names every part studio, assembly,
//      and imported file in the document ("Turret gear", "Shooter", ...).
//   2. Assembly instance tree (GET /assemblies/d/.../e/{eid}). Requires an
//      Onshape API key; used automatically when ONSHAPE_ACCESS_KEY and
//      ONSHAPE_SECRET_KEY are set in .env.local. Skipped otherwise.
//
// Usage:
//   node scraper/tag-mechanisms.mjs --sample        # ~18 mixed entries, prints results
//   node scraper/tag-mechanisms.mjs                 # every Onshape entry -> data/onshape-tags.json
//   flags: --retry-errors  refetch documents that previously failed
//
// Results are cached per document in scraper/.cache/onshape.json so re-runs
// don't refetch. Unreadable documents are logged and fall back to title-only tags.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tagsFromNames, orderTags } from "./tags.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SCRAPED_PATH = path.join(ROOT, "data", "scraped.json");
const OUTPUT_PATH = path.join(ROOT, "data", "onshape-tags.json");
const CACHE_PATH = path.join(__dirname, ".cache", "onshape.json");
const ERROR_LOG_PATH = path.join(__dirname, ".cache", "onshape-errors.log");

const API = "https://cad.onshape.com/api/v10";
const DELAY_MS = 350;
const MAX_RETRIES = 5;

try {
  process.loadEnvFile(path.join(ROOT, ".env.local"));
} catch {
  // no .env.local: unauthenticated mode (element list only)
}
const ACCESS = process.env.ONSHAPE_ACCESS_KEY;
const SECRET = process.env.ONSHAPE_SECRET_KEY;
const HAS_KEYS = Boolean(ACCESS && SECRET);
const AUTH_HEADER = HAS_KEYS ? `Basic ${Buffer.from(`${ACCESS}:${SECRET}`).toString("base64")}` : null;

const args = new Set(process.argv.slice(2));
const SAMPLE = args.has("--sample");
const RETRY_ERRORS = args.has("--retry-errors");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function parseOnshapeUrl(url) {
  const m = url?.match(/cad\.onshape\.com\/documents\/([0-9a-f]+)\/([wvm])\/([0-9a-f]+)\/e\/([0-9a-f]+)/i);
  return m ? { did: m[1], wvm: m[2], wvmId: m[3], eid: m[4] } : null;
}

async function apiGet(pathAndQuery) {
  let attempt = 0;
  while (true) {
    await sleep(DELAY_MS);
    let res;
    try {
      res = await fetch(`${API}${pathAndQuery}`, {
        headers: { Accept: "application/json", ...(AUTH_HEADER ? { Authorization: AUTH_HEADER } : {}) },
      });
    } catch (err) {
      if (++attempt > MAX_RETRIES) return { status: "network-error", error: err.message };
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    if (res.ok) return { status: "ok", json: await res.json() };
    if (res.status === 429 || res.status >= 500) {
      if (++attempt > MAX_RETRIES) return { status: `http-${res.status}` };
      const retryAfter = Number(res.headers.get("retry-after"));
      const wait = retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt;
      console.warn(`  ${res.status} from Onshape, waiting ${Math.round(wait / 1000)}s (retry ${attempt}/${MAX_RETRIES})`);
      await sleep(wait);
      continue;
    }
    return { status: `http-${res.status}` };
  }
}

let cache = { elements: {}, assemblies: {} };
async function loadCache() {
  try {
    cache = JSON.parse(await readFile(CACHE_PATH, "utf-8"));
  } catch {
    // first run
  }
}
async function saveCache() {
  await mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await writeFile(CACHE_PATH, JSON.stringify(cache), "utf-8");
}

// "unreadable" statuses are cached so re-runs skip them; transient ones are not.
const PERMANENT_FAIL = new Set(["http-401", "http-403", "http-404"]);
const isCached = (entry) => entry && (entry.status === "ok" || (PERMANENT_FAIL.has(entry.status) && !RETRY_ERRORS));

async function getElementNames(ref) {
  const key = `${ref.did}/${ref.wvm}/${ref.wvmId}`;
  if (isCached(cache.elements[key])) return cache.elements[key];
  const res = await apiGet(`/documents/d/${ref.did}/${ref.wvm}/${ref.wvmId}/elements`);
  const entry =
    res.status === "ok"
      ? { status: "ok", names: res.json.map((e) => e.name).filter(Boolean) }
      : { status: res.status };
  if (entry.status === "ok" || PERMANENT_FAIL.has(entry.status)) {
    cache.elements[key] = entry;
    await saveCache();
  }
  return entry;
}

async function getAssemblyNames(ref) {
  if (!HAS_KEYS) return { status: "no-key" };
  const key = `${ref.did}/${ref.wvm}/${ref.wvmId}/${ref.eid}`;
  if (isCached(cache.assemblies[key])) return cache.assemblies[key];
  const q = "?includeMateFeatures=false&includeNonSolids=false&includeMateConnectors=false&excludeSuppressed=true";
  const res = await apiGet(`/assemblies/d/${ref.did}/${ref.wvm}/${ref.wvmId}/e/${ref.eid}${q}`);
  let entry;
  if (res.status === "ok") {
    const names = new Set();
    const root = res.json.rootAssembly;
    for (const inst of root?.instances ?? []) if (inst.name) names.add(inst.name);
    for (const sub of res.json.subAssemblies ?? []) for (const inst of sub.instances ?? []) if (inst.name) names.add(inst.name);
    entry = { status: "ok", names: [...names] };
  } else {
    entry = { status: res.status };
  }
  if (entry.status === "ok" || PERMANENT_FAIL.has(entry.status)) {
    cache.assemblies[key] = entry;
    await saveCache();
  }
  return entry;
}

async function tagEntry(entry) {
  const ref = parseOnshapeUrl(entry.url);
  if (!ref) return { status: "not-an-onshape-element-url", tags: [], evidence: {} };

  const elements = await getElementNames(ref);
  const assembly = await getAssemblyNames(ref);
  // The assembly tree describes exactly what is in the pinned assembly, so it
  // wins when readable. Document-wide element names also cover unused/old
  // part studios and other tabs, so they are only the fallback.
  const treeOk = assembly.status === "ok";
  const names = treeOk ? assembly.names : (elements.names ?? []);
  const { tags, evidence } = tagsFromNames(names);

  // Only fully "unreadable" if the element list (the public source) failed.
  return {
    status: elements.status === "ok" ? "ok" : elements.status,
    assemblyTree: assembly.status,
    source: treeOk ? "assembly-tree" : "document-elements",
    elementCount: elements.names?.length ?? 0,
    partNameCount: names.length,
    tags: orderTags(tags),
    evidence: Object.fromEntries(Object.entries(evidence).map(([t, n]) => [t, n.slice(0, 6)])),
  };
}

function pickSample(entries) {
  const onshape = entries.filter((e) => parseOnshapeUrl(e.url));
  const byCat = new Map();
  for (const e of onshape) {
    if (!byCat.has(e.primaryCategory)) byCat.set(e.primaryCategory, []);
    byCat.get(e.primaryCategory).push(e);
  }
  const take = (cat, n) => {
    const list = byCat.get(cat) ?? [];
    if (list.length <= n) return list;
    const step = list.length / n;
    return Array.from({ length: n }, (_, i) => list[Math.floor(i * step)]);
  };
  return [
    ...take("Full Robot", 7),
    ...take("Swerve Drive", 3),
    ...take("Drivetrain (Mecanum/Tank)", 2),
    ...take("Intake", 2),
    ...take("Claw / Gripper", 1),
    ...take("Linear Slides / Extension", 1),
    ...take("Differential / PTO", 1),
    ...take("Vector Wheel", 1),
    ...take("Dead Axle Wheel", 1),
    ...take("Camera Mount", 1),
    ...take("Drone Launcher", 1),
    ...take("Turret", 1),
    ...take("Shooter", 1),
  ];
}

async function main() {
  await loadCache();
  const entries = JSON.parse(await readFile(SCRAPED_PATH, "utf-8"));
  const targets = SAMPLE ? pickSample(entries) : entries.filter((e) => parseOnshapeUrl(e.url));
  console.log(
    `${HAS_KEYS ? "API key found: using assembly trees + element lists." : "No API key: using public element lists only."}`
  );
  console.log(`Tagging ${targets.length} Onshape entries${SAMPLE ? " (sample)" : ""}...\n`);

  const results = {};
  const failures = [];
  let i = 0;
  for (const entry of targets) {
    i++;
    const r = await tagEntry(entry);
    results[entry.url] = { ...r, fetchedAt: new Date().toISOString() };
    if (r.status !== "ok") failures.push(`${entry.url}\t${r.status}\t${entry.title} | ${entry.assemblyName}`);
    if (SAMPLE) {
      const titleOnly = entry.tags.join(", ") || "(none)";
      const merged = orderTags([...entry.tags, ...r.tags]);
      console.log(`[${i}/${targets.length}] ${entry.title} | ${entry.assemblyName}`);
      console.log(`    primary: ${entry.primaryCategory}   status: ${r.status}   elements: ${r.elementCount}`);
      console.log(`    title tags:  ${titleOnly}`);
      console.log(`    onshape tags: ${r.tags.join(", ") || "(none)"}`);
      console.log(`    FINAL:       ${merged.join(", ")}`);
      for (const [tag, names] of Object.entries(r.evidence)) console.log(`      - ${tag}: ${names.join(" / ")}`);
      console.log();
    } else if (i % 25 === 0) {
      console.log(`  ...${i}/${targets.length}`);
    }
  }

  const out = SAMPLE ? OUTPUT_PATH.replace(".json", ".sample.json") : OUTPUT_PATH;
  await writeFile(out, JSON.stringify(results, null, 2), "utf-8");
  await mkdir(path.dirname(ERROR_LOG_PATH), { recursive: true });
  await writeFile(ERROR_LOG_PATH, failures.join("\n"), "utf-8");

  const ok = Object.values(results).filter((r) => r.status === "ok").length;
  console.log(`Done. ${ok}/${targets.length} documents readable; ${failures.length} unreadable (title-only tags for those).`);
  if (failures.length) console.log(`Unreadable list: ${ERROR_LOG_PATH}`);
  console.log(`Wrote ${out}`);
}

main();
