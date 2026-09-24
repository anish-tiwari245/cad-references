import { MECHANISM_VOCAB, FULL_ROBOT, tagsFromText, orderTags } from "./tags.mjs";

// Best-effort classification of a pin's title/assembly text into the fields
// the website filters on. Ambiguous calls are flagged via needsReview rather
// than guessed silently, per the task brief.

export const FTC_SEASONS = [
  { years: "2005-2006", name: "Half-Pipe Hustle" },
  { years: "2006-2007", name: "Hangin'-A-Round" },
  { years: "2007-2008", name: "Quad Quandary" },
  { years: "2008-2009", name: "Face Off" },
  { years: "2009-2010", name: "Hot Shot!" },
  { years: "2010-2011", name: "Get Over It!" },
  { years: "2011-2012", name: "Bowled Over!" },
  { years: "2012-2013", name: "Ring It Up!" },
  { years: "2013-2014", name: "Block Party!" },
  { years: "2014-2015", name: "Cascade Effect" },
  { years: "2015-2016", name: "FIRST Res-Q" },
  { years: "2016-2017", name: "Velocity Vortex" },
  { years: "2017-2018", name: "Relic Recovery" },
  { years: "2018-2019", name: "Rover Ruckus" },
  { years: "2019-2020", name: "Skystone" },
  { years: "2020-2021", name: "Ultimate Goal" },
  { years: "2021-2022", name: "Freight Frenzy" },
  { years: "2022-2023", name: "Power Play" },
  { years: "2023-2024", name: "Centerstage" },
  { years: "2024-2025", name: "Into the Deep" },
  { years: "2025-2026", name: "Decode" },
  { years: "2026-2027", name: "Biobuzz" },
];

const UNSPECIFIED = "Unspecified / Offseason";

// Full season-name phrase matches (highest confidence).
const NAME_PATTERNS = [
  [/half.?pipe hustle/i, "Half-Pipe Hustle"],
  [/hangin.?.?a.?.?round/i, "Hangin'-A-Round"],
  [/quad quandary/i, "Quad Quandary"],
  [/face.?off/i, "Face Off"],
  [/hot shot/i, "Hot Shot!"],
  [/get over it/i, "Get Over It!"],
  [/bowled over/i, "Bowled Over!"],
  [/ring it up/i, "Ring It Up!"],
  [/block party/i, "Block Party!"],
  [/cascade effect/i, "Cascade Effect"],
  [/res-?q/i, "FIRST Res-Q"],
  [/velocity vortex/i, "Velocity Vortex"],
  [/relic recovery/i, "Relic Recovery"],
  [/rover ruckus/i, "Rover Ruckus"],
  [/skystone/i, "Skystone"],
  [/ultimate goal/i, "Ultimate Goal"],
  [/freight frenzy/i, "Freight Frenzy"],
  [/power play/i, "Power Play"],
  [/centerstage/i, "Centerstage"],
  [/into the deep/i, "Into the Deep"],
  [/\bdecode\b/i, "Decode"],
  [/biobuzz/i, "Biobuzz"],
];

// Community abbreviations that are specific enough to trust as whole tokens.
const ABBREVIATION_PATTERNS = [
  [/\bitd\b/i, "Into the Deep"],
  [/\bcs\b/i, "Centerstage"],
  [/\bpp\b/i, "Power Play"],
  [/\bff\b/i, "Freight Frenzy"],
  [/\bug\b/i, "Ultimate Goal"],
  [/\bss\b/i, "Skystone"],
];

// Two-digit season year ranges, e.g. "25-26" or "2025-2026" -> Decode.
const YEAR_RANGE_RE = /\b(20)?(\d{2})-(20)?(\d{2})\b/;

function seasonFromYearRange(text) {
  const m = text.match(YEAR_RANGE_RE);
  if (!m) return null;
  const startYY = m[2];
  const start = Number(startYY) >= 5 && Number(startYY) <= 27 ? `20${startYY}` : null;
  if (!start) return null;
  const endYY = m[4];
  const end = `20${endYY}`;
  const key = `${start}-${end}`;
  const hit = FTC_SEASONS.find((s) => s.years === key);
  return hit ? hit.name : null;
}

export function classifySeason(text) {
  for (const [re, name] of NAME_PATTERNS) {
    if (re.test(text)) return { season: name, needsReview: false };
  }
  const yearMatch = seasonFromYearRange(text);
  if (yearMatch) return { season: yearMatch, needsReview: false };
  for (const [re, name] of ABBREVIATION_PATTERNS) {
    if (re.test(text)) return { season: name, needsReview: true, reviewReason: `season inferred from ambiguous abbreviation in "${text}"` };
  }
  return { season: UNSPECIFIED, needsReview: false };
}

export function classifyProgram(text) {
  if (/\bfrc\b/i.test(text)) return "FRC";
  return "FTC";
}

const FULL_ROBOT_HINT = /\brobot\b|\bbot\b|full assembly|full robot|full bot|master assembly|main assembly|worlds|nationals|states|regionals|top level robot/i;
const ROBOT_WORD = /\b(robot|bot)\b/i;

// Primary category = first vocabulary match in priority order, else Full Robot.
// Tags = every vocabulary match in the title, plus Full Robot when the text
// says "robot"/"bot" (a swerve robot should surface under both filters).
export function classifyMechanism(text) {
  const titleTags = tagsFromText(text);
  const primaryMatch = MECHANISM_VOCAB.find((v) => titleTags.includes(v.tag));
  const tags = new Set(titleTags);
  let primaryCategory;
  let needsReview = false;
  let reviewReason;
  if (primaryMatch) {
    primaryCategory = primaryMatch.tag;
    if (ROBOT_WORD.test(text) && primaryCategory !== "Number Plate / Misc") tags.add(FULL_ROBOT);
  } else {
    primaryCategory = FULL_ROBOT;
    tags.add(FULL_ROBOT);
    if (!FULL_ROBOT_HINT.test(text)) {
      needsReview = true;
      reviewReason = `no mechanism keyword matched "${text}", defaulted to Full Robot`;
    }
  }
  return { primaryCategory, tags: orderTags([...tags]), needsReview, reviewReason };
}

export function classifyCadPlatform(domain, url) {
  const d = (domain || "").toLowerCase();
  const u = (url || "").toLowerCase();
  if (d.includes("onshape.com")) return "Onshape";
  if (d.includes("autodesk360.com") || d.includes("autodesk.com") || u.includes("autodesk")) return "Fusion 360";
  if (d.includes("grabcad.com")) return "GrabCAD";
  if (d.includes("drive.google.com") || d.includes("docs.google.com")) return "Google Drive";
  return "Other";
}

export function classifyPin(rawTitleText, domain, url) {
  const [titlePart, ...rest] = rawTitleText.split(" | ");
  const title = titlePart.trim();
  const assemblyName = rest.length ? rest.join(" | ").trim() : title;
  const combined = rawTitleText;

  const program = classifyProgram(combined);
  const seasonResult = classifySeason(combined);
  const mechanismResult = classifyMechanism(combined);
  const cadPlatform = classifyCadPlatform(domain, url);

  const needsReview = seasonResult.needsReview || mechanismResult.needsReview;
  const reviewReasons = [seasonResult.reviewReason, mechanismResult.reviewReason].filter(Boolean);

  return {
    title,
    assemblyName,
    program,
    season: seasonResult.season,
    primaryCategory: mechanismResult.primaryCategory,
    tags: mechanismResult.tags,
    cadPlatform,
    needsReview,
    reviewReason: reviewReasons.length ? reviewReasons.join("; ") : null,
  };
}
