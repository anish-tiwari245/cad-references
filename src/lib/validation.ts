import { CAD_PLATFORMS, MECHANISM_TAGS, SEASON_ORDER } from "./constants";
import type { CadPlatform, Program } from "./types";

export function cleanHttpUrl(value: unknown, maxLength = 500): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? trimmed : null;
  } catch {
    return null;
  }
}

// Same link written slightly differently (case, trailing slash, #fragment)
// should count as the same file when checking for duplicates.
export function normalizeUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    url.hash = "";
    return (url.origin + url.pathname.replace(/\/+$/, "") + url.search).toLowerCase();
  } catch {
    return value.trim().toLowerCase();
  }
}

export function cleanProgram(value: unknown): Program | null {
  return value === "FTC" || value === "FRC" ? value : null;
}

export function cleanSeason(program: Program, value: unknown): string | null {
  if (typeof value !== "string") return null;
  const season = value.trim();
  if (program === "FTC") return SEASON_ORDER.includes(season) ? season : null;
  const year = Number(season);
  const maxYear = new Date().getFullYear() + 1;
  return /^\d{4}$/.test(season) && year >= 1992 && year <= maxYear ? season : null;
}

export function cleanTags(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MECHANISM_TAGS.length * 2) return null;
  if (!value.every((t) => typeof t === "string" && MECHANISM_TAGS.includes(t))) return null;
  return [...new Set<string>(value)];
}

export function cleanPlatform(value: unknown): CadPlatform | null {
  return typeof value === "string" && CAD_PLATFORMS.includes(value) ? (value as CadPlatform) : null;
}

export function cleanOptionalText(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length > maxLength) return undefined;
  return trimmed || null;
}

export function cleanOptionalEmail(value: unknown): string | null | undefined {
  const text = cleanOptionalText(value, 200);
  if (text === undefined || text === null) return text;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text : undefined;
}
