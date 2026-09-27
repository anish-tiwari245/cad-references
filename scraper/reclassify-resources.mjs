// One-time pass over the existing Redis library:
//   1. Marks true resource links (websites, doc galleries, spreadsheet
//      indexes, forms, an app-store listing) as kind:"resource" and strips
//      their "Full Robot" tag — they aren't a mechanism.
//   2. Reclassifies singular-part CAD files that were defaulted to "Full
//      Robot" (no keyword matched their title) as "Misc" instead, or a more
//      specific tag where the title makes it obvious.
//   3. Every other entry gets kind:"cad" if it didn't already have a kind
//      (this field is new).
//   4. Re-dumps the final Redis state to data/cad-files.json so the JSON
//      fallback stays in sync.
//
// Matching is by exact (title, assemblyName) pair, verified unique against
// the live data before this script was written. Re-running is safe/idempotent.
//
// Usage: node scraper/reclassify-resources.mjs [--dry-run]

import { Redis } from "@upstash/redis";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

// Links that aren't one CAD document to open: a link hub, a general
// reference/company site, a documentation gallery, a Google Form, a Google
// Sheet that's an index of other links, or an Onshape app-store listing.
const RESOURCE_PAIRS = [
  ["openflap/openmold", "Linktree"],
  ["Mech Nest", "Mech Nest"],
  ["Gallery Of Robot Designs - Game Manual 0", "Gallery Of Robot Designs - Game Manual 0"],
  ["RoboFTC", "RoboFTC"],
  ["The Loony Squad - LoonyLib", "The Loony Squad - LoonyLib"],
  ["Open Source 3D Printable Items – Ferra Components", "Open Source 3D Printable Items – Ferra Components"],
  ["OpenVault - CAD - Active Intakes", "OpenVault - CAD - Active Intakes"],
  ["BeeBase Email Form", "BeeBase Email Form"],
  ["Application for Simba's Configurable Library", "Application for Simba's Configurable Library"],
  ["FRC CAD Collection - Spectrum3847 - Google Sheets", "FRC CAD Collection - Spectrum3847 - Google Sheets"],
  ["FTC Robot CAD Links - Google Sheets", "FTC Robot CAD Links - Google Sheets"],
  ["App Store - Onshape", "App Store - Onshape"],
];

// Real CAD documents (Onshape/Fusion/Drive) that are one part or a small
// parts/props collection, not a full robot — defaulted to "Full Robot"
// because no keyword in the title matched anything more specific.
const MISC_PAIRS = [
  ["what the sigma drive(s)", "infinity side"],
  ["Project Velox", "v3 Right Module"],
  ["Project Velox", "v4 Left Module"],
  ["Deposit", "Deposit"],
  ["Boxtube v3 - AUTODESK FUSION", "Boxtube v3 - AUTODESK FUSION"],
  ["30030 Simplified Grip Forces (configurable)", "Wheel module left"],
  ["QR-20-A-0200.STEP", "QR-20-A-0200"],
  ["QR-23-A-0000.STEP", "QR-23-A-0000"],
  ["DeSoto Technix Driver Station V2 open source", "Assembly 2"],
  ["DeSoto Technix mini field Decode - open source", "good mini field v2"],
  ["DeSoto Technix CAD Library - open source", "Assembly 2"],
  ["Configurable Parts", "Gears"],
  ["Configurable Standoff W/ Screws", "6mm Standoff W/ Screws"],
  ["Configurable Parts", "Linear Rail Assembly"],
  ["Simplified Parts for FTC", "Simplified goBILDA Motor"],
  ["Config Bevel Gears", "Part Studio 1"],
  ["PulleyGen with Mods (we didn't make the original)", "HTD Pulley"],
  ["Belt Gen V2", "Part Studio 1"],
  ["OpenFlap", "TPU OpenFlap"],
  ["OpWheel", "OpWheel"],
  ["3D Printable Belt Gen", "Part Studio 1"],
  ["opInsert", "V2"],
  ["opInsert", "Examples"],
  ["Configurable Pivoting Boxtube", "Configurable Pivoting Boxtube"],
  ["Ball Bearings", `6" ID x 6.5" OD x .25" WD (X-Contact Bearing)`],
  ["Low Profile Encoder cap", "Part Studio 1"],
  ["Better Motor Encoder Cap", "Assembly 1"],
  ["reinforced 1:1 adaptor", "5105-0208-0019"],
  ["OP Clip", "OpClip"],
  ["Partial Spur Gear", "Gear assembly"],
  ["GearLabFS-Public", "Ex5: Inherit from Parent (Bevel Gears)"],
  ["FTCdesign Featurescripts", "ftcdesign.png"],
  ["14468 [undefined] FTC parts library", "14468 logo.png"],
];

// Same idea, but the title makes a more specific tag obvious.
const SPECIFIC_PAIRS = [
  [["Opsign V2", "ParallePlate"], "Number Plate / Misc"],
  [["opTake", "Blue Version"], "Intake"],
  [["OpSpool v2 (FTC 23511)", "Spool"], "Linear Slides / Extension"],
];

function key(title, assemblyName) {
  return `${title}\u0000${assemblyName}`;
}

async function main() {
  const ids = await redis.lrange(ORDER_KEY, 0, -1);
  const byId = await redis.hmget(ENTRIES_KEY, ...ids);
  const entries = ids.map((id) => byId[id]).filter(Boolean);
  if (entries.length !== ids.length) {
    console.error(`Order list has ${ids.length} ids but only found ${entries.length} entries. Stopping.`);
    process.exit(1);
  }

  const byKey = new Map(entries.map((e) => [key(e.title, e.assemblyName), e]));
  const updates = new Map(); // id -> updated entry

  function apply(pairs, fn) {
    for (const [title, assemblyName] of pairs) {
      const entry = byKey.get(key(title, assemblyName));
      if (!entry) {
        console.warn(`  not found (skipped): "${title}" | "${assemblyName}"`);
        continue;
      }
      updates.set(entry.id, fn(entry));
    }
  }

  apply(RESOURCE_PAIRS, (e) => ({
    ...e,
    kind: "resource",
    tags: [],
    primaryCategory: "",
    needsReview: false,
    reviewReason: null,
  }));

  apply(MISC_PAIRS, (e) => ({
    ...e,
    kind: "cad",
    tags: ["Misc"],
    primaryCategory: "Misc",
    needsReview: false,
    reviewReason: null,
  }));

  for (const [[title, assemblyName], tag] of SPECIFIC_PAIRS) {
    const entry = byKey.get(key(title, assemblyName));
    if (!entry) {
      console.warn(`  not found (skipped): "${title}" | "${assemblyName}"`);
      continue;
    }
    updates.set(entry.id, { ...entry, kind: "cad", tags: [tag], primaryCategory: tag, needsReview: false, reviewReason: null });
  }

  // Everything else just gets kind:"cad" if it's missing (new field).
  let backfilled = 0;
  for (const e of entries) {
    if (!updates.has(e.id) && !e.kind) {
      updates.set(e.id, { ...e, kind: "cad" });
      backfilled++;
    }
  }

  console.log(`Resources: ${RESOURCE_PAIRS.length} targeted. Misc: ${MISC_PAIRS.length + SPECIFIC_PAIRS.length} targeted.`);
  console.log(`Entries to write: ${updates.size} (includes ${backfilled} that only needed kind:"cad" backfilled).`);

  if (DRY) {
    console.log("Dry run: nothing written.");
    return;
  }

  const all = [...updates.values()];
  const CHUNK = 50;
  for (let i = 0; i < all.length; i += CHUNK) {
    const slice = all.slice(i, i + CHUNK);
    await redis.hset(ENTRIES_KEY, Object.fromEntries(slice.map((e) => [e.id, e])));
  }
  console.log(`Wrote ${all.length} updated entries to Redis.`);

  // Re-dump the full current state as the new JSON fallback.
  const finalIds = await redis.lrange(ORDER_KEY, 0, -1);
  const finalById = await redis.hmget(ENTRIES_KEY, ...finalIds);
  const final = finalIds.map((id) => finalById[id]).filter(Boolean);
  await writeFile(path.join(ROOT, "data", "cad-files.json"), JSON.stringify(final, null, 2), "utf-8");
  console.log(`Re-dumped data/cad-files.json with ${final.length} entries (fallback snapshot).`);

  const kindCounts = {};
  const tagCounts = {};
  for (const e of final) {
    kindCounts[e.kind] = (kindCounts[e.kind] || 0) + 1;
    for (const t of e.tags) tagCounts[t] = (tagCounts[t] || 0) + 1;
  }
  console.log("kind counts:", JSON.stringify(kindCounts));
  console.log("tag counts:", JSON.stringify(tagCounts));
}

main();
