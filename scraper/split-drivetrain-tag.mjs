// One-time migration: splits the retired "Drivetrain (Mecanum/Tank)" tag
// into "Drivetrain (Mecanum)", "Drivetrain (Tank)", or "Drivetrain
// (Unspecified)" on every existing entry, using the same regexes tags.mjs
// now uses going forward. Most pins just say "drivetrain"/"chassis" with no
// indication of which kind, so those become Unspecified rather than guessed.
//
// Usage:
//   node scraper/split-drivetrain-tag.mjs --dry-run
//   node scraper/split-drivetrain-tag.mjs

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
const OLD_TAG = "Drivetrain (Mecanum/Tank)";

const MECANUM_RE = /mecanum|octocanum|\bmec\b|\blmec\b/i;
const TANK_RE = /\btank\b|\btread|skid.?steer|\b[68]wd\b/i;

function splitTag(entry) {
  const text = `${entry.title} ${entry.assemblyName}`;
  if (MECANUM_RE.test(text)) return "Drivetrain (Mecanum)";
  if (TANK_RE.test(text)) return "Drivetrain (Tank)";
  return "Drivetrain (Unspecified)";
}

async function main() {
  const ids = await redis.lrange(ORDER_KEY, 0, -1);
  const byId = await redis.hmget(ENTRIES_KEY, ...ids);
  const entries = ids.map((id) => byId[id]).filter(Boolean);

  const updates = new Map();
  const counts = { "Drivetrain (Mecanum)": 0, "Drivetrain (Tank)": 0, "Drivetrain (Unspecified)": 0 };

  for (const entry of entries) {
    if (!entry.tags.includes(OLD_TAG)) continue;
    const newTag = splitTag(entry);
    counts[newTag]++;
    const tags = orderTags([...entry.tags.filter((t) => t !== OLD_TAG), newTag]);
    const primaryCategory = entry.primaryCategory === OLD_TAG ? newTag : entry.primaryCategory;
    updates.set(entry.id, { ...entry, tags, primaryCategory });
  }

  console.log(`${updates.size} entries carry the old tag.`);
  console.log(`  -> Mecanum: ${counts["Drivetrain (Mecanum)"]}`);
  console.log(`  -> Tank: ${counts["Drivetrain (Tank)"]}`);
  console.log(`  -> Unspecified: ${counts["Drivetrain (Unspecified)"]}`);

  if (DRY) {
    console.log("\nDry run: nothing written. Examples:");
    let shown = 0;
    for (const [id, e] of updates) {
      if (shown++ >= 15) break;
      console.log(`  ${e.primaryCategory === e.tags.find((t) => t.startsWith("Drivetrain")) ? "*" : " "} ${e.title} | ${e.assemblyName} -> ${e.tags.filter((t) => t.startsWith("Drivetrain")).join(", ")}`);
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

  const stray = final.filter((e) => e.tags.includes(OLD_TAG) || e.primaryCategory === OLD_TAG);
  if (stray.length) console.error(`WARNING: ${stray.length} entries still reference the old tag.`);
}

main();
