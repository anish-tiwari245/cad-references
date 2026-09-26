// One-time migration: loads data/cad-files.json into Redis (Upstash).
//
// Redis becomes the source of truth for the library after this. The JSON file
// stays in the repo as a seed and as the site's fallback if Redis is down.
//
// Usage:
//   npm run migrate            # refuses if the library already exists in Redis
//   npm run migrate -- --force # WIPES the Redis library and reloads it from the JSON file.
//                              # Admin approvals/deletions made since the last migration are lost.

import { Redis } from "@upstash/redis";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
try {
  process.loadEnvFile(path.join(ROOT, ".env.local"));
} catch {
  // rely on real environment variables
}

const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;
if (!url || !token) {
  console.error("Missing KV_REST_API_URL / KV_REST_API_TOKEN (expected in .env.local).");
  process.exit(1);
}

const ENTRIES_KEY = "cad:entries";
const ORDER_KEY = "cad:order";
const force = process.argv.includes("--force");

const redis = new Redis({ url, token });
const entries = JSON.parse(await readFile(path.join(ROOT, "data", "cad-files.json"), "utf-8"));

const existing = await redis.llen(ORDER_KEY);
if (existing > 0 && !force) {
  console.error(`Redis already holds ${existing} entries. Refusing to overwrite.`);
  console.error("Re-run with --force to wipe and reload from data/cad-files.json (approvals/deletions since then would be lost).");
  process.exit(1);
}
if (existing > 0) {
  console.warn(`--force: wiping ${existing} existing entries first.`);
  await redis.del(ENTRIES_KEY, ORDER_KEY);
}

const ids = entries.map((e) => e.id);
if (new Set(ids).size !== ids.length) {
  console.error("Duplicate ids in data/cad-files.json; refusing to migrate.");
  process.exit(1);
}

const CHUNK = 50;
for (let i = 0; i < entries.length; i += CHUNK) {
  const slice = entries.slice(i, i + CHUNK);
  await redis.hset(ENTRIES_KEY, Object.fromEntries(slice.map((e) => [e.id, e])));
  await redis.rpush(ORDER_KEY, ...slice.map((e) => e.id));
}

const [count, order] = await Promise.all([redis.hlen(ENTRIES_KEY), redis.llen(ORDER_KEY)]);
console.log(`Migrated ${entries.length} entries. Redis now has ${count} entries and ${order} ordered ids.`);
if (count !== entries.length || order !== entries.length) {
  console.error("Counts do not match. Something went wrong; check Redis before continuing.");
  process.exit(1);
}
