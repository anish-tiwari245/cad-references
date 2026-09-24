// Builds the final data/cad-files.json the site reads:
//   data/scraped.json         title-based classification (scraper/scrape.mjs)
// + data/onshape-tags.json    tags found inside Onshape documents (scraper/tag-mechanisms.mjs)
// + data/tag-overrides.json   hand corrections, applied last
//
// Usage: node scraper/build-dataset.mjs

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_TAGS, orderTags } from "./tags.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = (f) => path.join(ROOT, "data", f);

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(dataPath(file), "utf-8"));
  } catch (err) {
    if (err.code === "ENOENT" && fallback !== undefined) return fallback;
    throw err;
  }
}

const scraped = await readJson("scraped.json");
const onshapeTags = await readJson("onshape-tags.json", {});
const overrides = await readJson("tag-overrides.json", {});

const known = new Set(ALL_TAGS);
const warnings = [];
const urls = new Set(scraped.map((e) => e.url));
const overrideEntries = Object.entries(overrides).filter(([key]) => !key.startsWith("_"));

for (const [url, o] of overrideEntries) {
  if (!urls.has(url)) warnings.push(`override for unknown URL (no matching entry): ${url}`);
  for (const tag of [...(o.add ?? []), ...(o.remove ?? []), ...(o.primaryCategory ? [o.primaryCategory] : [])]) {
    if (!known.has(tag)) warnings.push(`override uses unknown tag "${tag}" (${url})`);
  }
}
const overrideByUrl = Object.fromEntries(overrideEntries);

let fromCad = 0;
let overridden = 0;
const final = scraped.map((entry) => {
  const cad = onshapeTags[entry.url];
  const tags = new Set([...entry.tags, ...(cad?.tags ?? [])]);
  if (cad?.tags?.length) fromCad++;

  let primaryCategory = entry.primaryCategory;
  const o = overrideByUrl[entry.url];
  if (o) {
    overridden++;
    for (const t of o.add ?? []) if (known.has(t)) tags.add(t);
    for (const t of o.remove ?? []) tags.delete(t);
    if (o.primaryCategory && known.has(o.primaryCategory)) primaryCategory = o.primaryCategory;
  }
  // The primary category always appears in tags so filtering by it is consistent.
  tags.add(primaryCategory);

  return { ...entry, primaryCategory, tags: orderTags([...tags]) };
});

await writeFile(dataPath("cad-files.json"), JSON.stringify(final, null, 2), "utf-8");

const counts = {};
for (const e of final) for (const t of e.tags) counts[t] = (counts[t] ?? 0) + 1;
console.log(`Wrote data/cad-files.json: ${final.length} entries`);
console.log(`  gained tags from Onshape documents: ${fromCad}`);
console.log(`  manual overrides applied: ${overridden}`);
console.log(`  tag counts:`, counts);
for (const w of warnings) console.warn(`  WARNING: ${w}`);
