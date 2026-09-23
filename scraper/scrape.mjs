// Scrapes the Opera Pinboard of community FTC/FRC CAD files.
//
// The board is a client-rendered React app. All pin cards (title, assembly
// name, source link, source domain) are present in the DOM as soon as the
// board loads -- only the *thumbnail images* are lazy-loaded via an
// IntersectionObserver as you scroll the board's internal scroll container
// (div.App). So: grab card text/links immediately, then scroll the
// container step by step to trigger and collect thumbnails.
//
// Usage: node scrape.mjs

import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedTitles } from "./seed.mjs";
import { classifyPin } from "./classify.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOARD_URL = "https://pinboard.opera.com/view/6f30ddbc-c4d2-4fd9-8c35-9cba43a0b003";
const OUTPUT_PATH = path.join(__dirname, "..", "data", "cad-files.json");

async function extractCards(page) {
  return page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".pinboard-item"));
    return cards.map((card) => {
      const a = card.querySelector("a[href]");
      const img = card.querySelector("img");
      // The domain label is the small leaf text node that isn't the title link.
      const leafDivs = Array.from(card.querySelectorAll("div")).filter(
        (d) => d.children.length === 0 && d.textContent.trim().length > 0
      );
      const domainDiv = leafDivs.find((d) => /\./.test(d.textContent) && !/\s/.test(d.textContent.trim()));
      return {
        id: card.id || null,
        rawText: a ? a.textContent.trim() : null,
        url: a ? a.getAttribute("href") : null,
        domain: domainDiv ? domainDiv.textContent.trim() : null,
        thumbnail: img ? img.getAttribute("src") : null,
      };
    });
  });
}

async function collectThumbnails(page, thumbMap) {
  const rows = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".pinboard-item"));
    return cards
      .map((card) => ({ id: card.id, src: card.querySelector("img")?.getAttribute("src") || null }))
      .filter((r) => r.src);
  });
  for (const { id, src } of rows) {
    if (id && src) thumbMap.set(id, src);
  }
}

async function scrollAndCollectThumbnails(page, thumbMap) {
  const scrollInfo = await page.evaluate(() => {
    const container = document.querySelector(".App");
    return container
      ? { scrollHeight: container.scrollHeight, clientHeight: container.clientHeight }
      : null;
  });
  if (!scrollInfo) {
    console.warn("Could not find .App scroll container; skipping thumbnail scroll pass.");
    await collectThumbnails(page, thumbMap);
    return;
  }

  const step = Math.max(200, Math.floor(scrollInfo.clientHeight * 0.7));
  let position = 0;
  await collectThumbnails(page, thumbMap);

  while (position < scrollInfo.scrollHeight) {
    position += step;
    await page.evaluate((y) => {
      const container = document.querySelector(".App");
      if (container) container.scrollTop = y;
    }, position);
    await page.waitForTimeout(200);
    await collectThumbnails(page, thumbMap);
  }

  // Extra settle pass at the very bottom, then back to top, to catch stragglers.
  await page.evaluate(() => {
    const container = document.querySelector(".App");
    if (container) container.scrollTop = container.scrollHeight;
  });
  await page.waitForTimeout(400);
  await collectThumbnails(page, thumbMap);

  await page.evaluate(() => {
    const container = document.querySelector(".App");
    if (container) container.scrollTop = 0;
  });
  await page.waitForTimeout(300);
  await collectThumbnails(page, thumbMap);
}

async function scrapeLive() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    await page.goto(BOARD_URL, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForSelector(".pinboard-item", { timeout: 30000 });
    await page.waitForTimeout(1500);

    const cards = await extractCards(page);
    console.log(`Live scrape found ${cards.length} pin cards (text/links).`);

    const thumbMap = new Map();
    await scrollAndCollectThumbnails(page, thumbMap);
    console.log(`Collected ${thumbMap.size} thumbnails out of ${cards.length} cards.`);

    // If the DOM card count looks short vs. the seed dataset, retry once with
    // more generous waits before falling back to the seed list.
    if (cards.length < seedTitles.length) {
      console.warn(
        `Live scrape (${cards.length}) came back short of the seed list (${seedTitles.length}). Retrying with longer waits...`
      );
      await page.reload({ waitUntil: "networkidle", timeout: 60000 });
      await page.waitForSelector(".pinboard-item", { timeout: 30000 });
      await page.waitForTimeout(4000);
      const retryCards = await extractCards(page);
      if (retryCards.length > cards.length) {
        console.log(`Retry recovered ${retryCards.length} cards.`);
        const retryThumbs = new Map();
        await scrollAndCollectThumbnails(page, retryThumbs);
        for (const [id, src] of retryThumbs) thumbMap.set(id, src);
        return finalizeCards(retryCards, thumbMap);
      }
    }

    return finalizeCards(cards, thumbMap);
  } finally {
    await browser.close();
  }
}

function finalizeCards(cards, thumbMap) {
  return cards
    .filter((c) => c.rawText && c.url)
    .map((c) => ({ ...c, thumbnail: thumbMap.get(c.id) || c.thumbnail || null }));
}

function domainFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

// Some live pin titles carry decorative emoji/unicode the user's manual
// copy-paste dropped. Normalize by stripping non-ASCII characters so those
// still match exactly; a token-subset check below catches stray leftover
// ASCII artifacts (e.g. an emoji sitting between parens leaves bare letters).
function normalizeAscii(s) {
  return s
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s) {
  return (s.toLowerCase().match(/[a-z0-9]+/g) || []);
}

function isTokenSubset(seedTokens, liveTokens) {
  const liveCounts = new Map();
  for (const t of liveTokens) liveCounts.set(t, (liveCounts.get(t) || 0) + 1);
  for (const t of seedTokens) {
    const remaining = liveCounts.get(t) || 0;
    if (remaining <= 0) return false;
    liveCounts.set(t, remaining - 1);
  }
  return true;
}

function buildDataset(liveCards) {
  const byRawText = new Map();
  const byNormalized = new Map();
  for (const c of liveCards) {
    if (!byRawText.has(c.rawText)) byRawText.set(c.rawText, []);
    byRawText.get(c.rawText).push(c);
    const norm = normalizeAscii(c.rawText);
    if (!byNormalized.has(norm)) byNormalized.set(norm, []);
    byNormalized.get(norm).push(c);
  }

  const used = new Set();
  const entries = [];
  const unmatchedSeed = [];

  // Walk the seed list in order (its order matches the board's pin order).
  // Try exact raw text, then ASCII-normalized text, then a token-subset
  // fallback (handles stray characters left behind by stripped emoji).
  for (const seedText of seedTitles) {
    let candidate = (byRawText.get(seedText) || []).find((c) => !used.has(c));
    if (!candidate) {
      const norm = normalizeAscii(seedText);
      candidate = (byNormalized.get(norm) || []).find((c) => !used.has(c));
    }
    if (!candidate) {
      const seedTokens = tokenize(seedText);
      candidate = liveCards.find((c) => !used.has(c) && isTokenSubset(seedTokens, tokenize(c.rawText)));
    }
    if (candidate) {
      used.add(candidate);
      entries.push(candidate);
    } else {
      unmatchedSeed.push(seedText);
    }
  }

  // Any live cards not consumed above are extra pins added since the seed
  // was captured -- keep them too.
  const extraLive = liveCards.filter((c) => !used.has(c));

  // Any seed titles we couldn't find live (site changed / scrape gap):
  // include them as fallback entries with no URL/thumbnail, flagged for review.
  const fallbackEntries = unmatchedSeed.map((rawText) => ({
    id: null,
    rawText,
    url: null,
    domain: null,
    thumbnail: null,
    fallback: true,
  }));

  const all = [...entries, ...extraLive, ...fallbackEntries];

  return all.map((c, index) => {
    const classified = classifyPin(c.rawText, c.domain || domainFromUrl(c.url), c.url);
    const needsReview = classified.needsReview || c.fallback === true;
    const reviewReason = c.fallback
      ? [classified.reviewReason, "not found in live scrape; using seed title only, no source URL/thumbnail"]
          .filter(Boolean)
          .join("; ")
      : classified.reviewReason;
    return {
      id: c.id || `seed-${index}`,
      title: classified.title,
      assemblyName: classified.assemblyName,
      url: c.url,
      sourceDomain: c.domain || domainFromUrl(c.url),
      thumbnail: c.thumbnail,
      program: classified.program,
      season: classified.season,
      mechanismCategory: classified.mechanismCategory,
      cadPlatform: classified.cadPlatform,
      needsReview,
      reviewReason: reviewReason || null,
    };
  });
}

async function main() {
  let liveCards = [];
  let liveFailed = false;
  try {
    liveCards = await scrapeLive();
  } catch (err) {
    console.error("Live scrape failed entirely, falling back to seed list only:", err.message);
    liveFailed = true;
  }

  if (liveFailed || liveCards.length === 0) {
    liveCards = [];
  }

  const dataset = buildDataset(liveCards);

  const needsReviewCount = dataset.filter((d) => d.needsReview).length;
  const missingUrlCount = dataset.filter((d) => !d.url).length;
  console.log(`\nFinal dataset: ${dataset.length} entries`);
  console.log(`  - flagged needsReview: ${needsReviewCount}`);
  console.log(`  - missing source URL (seed-only fallback): ${missingUrlCount}`);
  console.log(`  - missing thumbnail: ${dataset.filter((d) => !d.thumbnail).length}`);

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(dataset, null, 2), "utf-8");
  console.log(`\nWrote ${OUTPUT_PATH}`);
}

main();
