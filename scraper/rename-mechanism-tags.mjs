// One-time migration for the Nov 2026 category cleanup:
//   - "Drivetrain (Mecanum)" -> "Mecanum"
//   - "Drivetrain (Tank)" -> "Tank"
//   - "Drivetrain (Unspecified)" -> removed entirely
// An entry that only had "Drivetrain (Unspecified)" has no mechanism signal
// left once it's gone, so it falls back to "Misc" rather than being left
// without a valid primaryCategory. An entry that had it as its primary
// category but also carries other tags promotes the first of those instead.
//
// Usage:
//   node scraper/rename-mechanism-tags.mjs --dry-run
//   node scraper/rename-mechanism-tags.mjs

import { Redis } from "@upstash/redis";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { orderTags } from "./tags.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
try {
  process.loadEnvFile(path.join(ROOT, ".env.local"));
} catch {
  // rely on real environment variables
}

const DRY = process.argv.includes("--dry-run");
const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
const ENTRIES_KEY = "cad:entries";
const ORDER_KEY = "cad:order";

const RENAME = { "Drivetrain (Mecanum)": "Mecanum", "Drivetrain (Tank)": "Tank" };
const REMOVE_TAG = "Drivetrain (Unspecified)";
const FALLBACK_CATEGORY = "Misc";
const OLD_TAGS = [...Object.keys(RENAME), REMOVE_TAG];

function migrate(entry) {
  const renamedTags = entry.tags.map((t) => RENAME[t] ?? t).filter((t) => t !== REMOVE_TAG);
  const orphaned = renamedTags.length === 0;
  const tags = orphaned ? [FALLBACK_CATEGORY] : renamedTags;

  let primaryCategory = RENAME[entry.primaryCategory] ?? entry.primaryCategory;
  if (orphaned) {
    primaryCategory = FALLBACK_CATEGORY;
  } else if (entry.primaryCategory === REMOVE_TAG) {
    primaryCategory = renamedTags[0];
  }

  return { ...entry, tags: orderTags(tags), primaryCategory, orphaned };
}

async function main() {
  const ids = await redis.lrange(ORDER_KEY, 0, -1);
  const byId = await redis.hmget(ENTRIES_KEY, ...ids);
  const entries = ids.map((id) => byId[id]).filter(Boolean);

  const updates = new Map();
  let mecanumCount = 0;
  let tankCount = 0;
  let unspecifiedRemoved = 0;
  let orphanedToMisc = 0;

  for (const entry of entries) {
    const touchesOld = entry.tags.some((t) => OLD_TAGS.includes(t)) || OLD_TAGS.includes(entry.primaryCategory);
    if (!touchesOld) continue;

    if (entry.tags.includes("Drivetrain (Mecanum)")) mecanumCount++;
    if (entry.tags.includes("Drivetrain (Tank)")) tankCount++;
    if (entry.tags.includes(REMOVE_TAG)) unspecifiedRemoved++;

    const updated = migrate(entry);
    if (updated.orphaned) orphanedToMisc++;
    const { orphaned, ...toStore } = updated;
    updates.set(entry.id, toStore);
  }

  console.log(`${updates.size} entries touched.`);
  console.log(`  Mecanum renamed: ${mecanumCount}`);
  console.log(`  Tank renamed: ${tankCount}`);
  console.log(`  Unspecified tag removed from: ${unspecifiedRemoved}`);
  console.log(`  Of those, fell back to Misc (had no other tag): ${orphanedToMisc}`);

  if (DRY) {
    console.log("\nDry run: nothing written. Examples:");
    let shown = 0;
    for (const [, e] of updates) {
      if (shown++ >= 20) break;
      console.log(`  ${e.title} -> primary: ${e.primaryCategory} | tags: ${e.tags.join(", ")}`);
    }
    return;
  }

  const all = [...updates.values()];
  const CHUNK = 50;
  for (let i = 0; i < all.length; i += CHUNK) {
    const slice = all.slice(i, i + CHUNK);
    await redis.hset(ENTRIES_KEY, Object.fromEntries(slice.map((e) => [e.id, e])));
  }
  console.log(`\nWrote ${all.length} updated entries to Redis.`);

  const finalIds = await redis.lrange(ORDER_KEY, 0, -1);
  const finalById = await redis.hmget(ENTRIES_KEY, ...finalIds);
  const final = finalIds.map((id) => finalById[id]).filter(Boolean);
  await writeFile(path.join(ROOT, "data", "cad-files.json"), JSON.stringify(final, null, 2), "utf-8");
  console.log(`Re-dumped data/cad-files.json with ${final.length} entries (fallback snapshot).`);

  const stray = final.filter((e) => e.tags.some((t) => OLD_TAGS.includes(t)) || OLD_TAGS.includes(e.primaryCategory));
  if (stray.length) console.error(`WARNING: ${stray.length} entries still reference an old tag.`);
}

main();
