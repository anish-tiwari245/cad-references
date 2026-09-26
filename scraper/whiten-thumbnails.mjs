// Replaces dark-background thumbnails (Onshape dark-mode screenshots) with
// Onshape's own white-background render of the model.
//
// The pinboard screenshots have the black baked into the pixels, so this
// re-renders from the Onshape thumbnail API (needs ONSHAPE_ACCESS_KEY and
// ONSHAPE_SECRET_KEY) and stores our own copy in Redis, the same way approved
// submissions work. Non-Onshape links (Google Drive, GrabCAD, ...) can't be
// re-rendered and are only listed.
//
// The original thumbnail URL is kept in Redis so the change can be undone.
//
// Usage:
//   npm run whiten -- --dry-run   # list what would change, touch nothing
//   npm run whiten                # do it
//   npm run whiten -- --undo      # put the original thumbnails back

import { Redis } from "@upstash/redis";
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
try {
  process.loadEnvFile(path.join(ROOT, ".env.local"));
} catch {
  // rely on real environment variables
}

const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry-run");
const UNDO = args.has("--undo");

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
const ENTRIES_KEY = "cad:entries";
const ORDER_KEY = "cad:order";
const BACKUP_KEY = "cad:thumb-backup"; // id -> original thumbnail URL
const thumbKey = (id) => `cad:thumb:${id}`;
const DARK_EDGE_LUMINANCE = 100; // 0-255; the dark screenshots measure 28-99, light ones 100+
const SIZE = "600x340";
const isOwn = (url) => typeof url === "string" && url.startsWith("/api/thumb/");

async function loadEntries() {
  const ids = await redis.lrange(ORDER_KEY, 0, -1);
  const byId = await redis.hmget(ENTRIES_KEY, ...ids);
  return ids.map((id) => byId[id]).filter(Boolean);
}

if (UNDO) {
  const backups = (await redis.hgetall(BACKUP_KEY)) ?? {};
  let restored = 0;
  for (const [id, original] of Object.entries(backups)) {
    const entry = await redis.hget(ENTRIES_KEY, id);
    if (entry) {
      await redis.hset(ENTRIES_KEY, { [id]: { ...entry, thumbnail: original } });
      restored++;
    }
    await redis.del(thumbKey(id));
    await redis.hdel(BACKUP_KEY, id);
  }
  console.log(`Restored ${restored} original thumbnails.`);
  process.exit(0);
}

const entries = await loadEntries();
const candidates = entries.filter((e) => typeof e.thumbnail === "string" && /^https?:/.test(e.thumbnail));
console.log(`${entries.length} entries, ${candidates.length} with an external thumbnail to check.`);

// Measure how dark each image's edge is (a 4px frame), using a real browser canvas.
const browser = await chromium.launch();
const page = await browser.newPage();
const measured = new Map();
let next = 0;
async function measureWorker() {
  while (next < candidates.length) {
    const entry = candidates[next++];
    try {
      const res = await fetch(entry.thumbnail, { signal: AbortSignal.timeout(20000) });
      const buf = Buffer.from(await res.arrayBuffer());
      const src = `data:${res.headers.get("content-type") || "image/png"};base64,${buf.toString("base64")}`;
      const edge = await page.evaluate(async (src) => {
        const img = new Image();
        await new Promise((ok, no) => {
          img.onload = ok;
          img.onerror = no;
          img.src = src;
        });
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, c.width, c.height).data;
        let sum = 0;
        let n = 0;
        for (let y = 0; y < c.height; y++) {
          for (let x = 0; x < c.width; x++) {
            if (x < 4 || y < 4 || x >= c.width - 4 || y >= c.height - 4) {
              const k = (y * c.width + x) * 4;
              sum += 0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2];
              n++;
            }
          }
        }
        return sum / n;
      }, src);
      measured.set(entry.id, edge);
    } catch {
      // unreadable image: leave it alone
    }
  }
}
await Promise.all(Array.from({ length: 6 }, measureWorker));
await browser.close();

const dark = candidates.filter((e) => (measured.get(e.id) ?? 255) < DARK_EDGE_LUMINANCE);
const ONSHAPE = /cad\.onshape\.com\/documents\/([0-9a-f]+)\/([wvm])\/([0-9a-f]+)\/e\/([0-9a-f]+)/i;
const fixable = dark.filter((e) => e.url && ONSHAPE.test(e.url));
const notFixable = dark.filter((e) => !fixable.includes(e));
console.log(`${dark.length} have a dark background: ${fixable.length} are Onshape (can be re-rendered), ${notFixable.length} are not.`);
for (const e of notFixable) console.log(`  cannot fix: ${e.title} (${e.sourceDomain})`);

if (DRY) {
  for (const e of fixable) console.log(`  would fix: ${e.title} | ${e.assemblyName}`);
  process.exit(0);
}

const access = process.env.ONSHAPE_ACCESS_KEY;
const secret = process.env.ONSHAPE_SECRET_KEY;
if (!access || !secret) {
  console.error("Missing ONSHAPE_ACCESS_KEY / ONSHAPE_SECRET_KEY.");
  process.exit(1);
}
const auth = `Basic ${Buffer.from(`${access}:${secret}`).toString("base64")}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function render(entry) {
  const [, did, wvm, wvmId, eid] = entry.url.match(ONSHAPE);
  for (let attempt = 0; attempt < 4; attempt++) {
    await sleep(350);
    const res = await fetch(`https://cad.onshape.com/api/v10/thumbnails/d/${did}/${wvm}/${wvmId}/e/${eid}/s/${SIZE}`, {
      headers: { Authorization: auth, Accept: "image/png" },
      signal: AbortSignal.timeout(20000),
    });
    if (res.status === 429) {
      await sleep(2000 * 2 ** attempt);
      continue;
    }
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    const bytes = Buffer.from(await res.arrayBuffer());
    if (!contentType.startsWith("image/") || bytes.length === 0 || bytes.length > 600_000) return { error: "not a usable image" };
    return { contentType, data: bytes.toString("base64") };
  }
  return { error: "rate limited" };
}

let done = 0;
const failed = [];
for (const entry of fixable) {
  const result = await render(entry);
  if (result.error) {
    failed.push(`${entry.title} (${result.error})`);
    continue;
  }
  const v = Date.now();
  await redis.set(thumbKey(entry.id), { contentType: result.contentType, data: result.data, v });
  await redis.hsetnx(BACKUP_KEY, entry.id, entry.thumbnail);
  await redis.hset(ENTRIES_KEY, { [entry.id]: { ...entry, thumbnail: `/api/thumb/${entry.id}?v=${v}` } });
  done++;
  if (done % 10 === 0) console.log(`  ...${done}/${fixable.length}`);
}
console.log(`Replaced ${done} thumbnails with white-background renders.`);
if (failed.length) console.log(`Left as-is (Onshape would not render them):\n  ${failed.join("\n  ")}`);
