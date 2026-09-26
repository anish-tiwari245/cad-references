import type { CadEntry } from "./types";
import { SEASON_ORDER, UNSPECIFIED_SEASON } from "./constants";

export function getSeasonOptions(entries: CadEntry[]): string[] {
  const present = new Set(entries.map((e) => e.season));
  const ordered = [...SEASON_ORDER].reverse().filter((s) => present.has(s));
  // FRC entries use a plain build-year season (e.g. "2025"), newest first.
  const years = [...present].filter((s) => /^\d{4}$/.test(s)).sort((a, b) => Number(b) - Number(a));
  ordered.push(...years);
  if (present.has(UNSPECIFIED_SEASON)) ordered.push(UNSPECIFIED_SEASON);
  return ordered;
}

export function getMechanismOptions(entries: CadEntry[], canonicalOrder: string[]): string[] {
  const present = new Set<string>(entries.flatMap((e) => e.tags));
  return canonicalOrder.filter((c) => present.has(c));
}

export function getPlatformOptions(entries: CadEntry[], canonicalOrder: string[]): string[] {
  const present = new Set<string>(entries.map((e) => e.cadPlatform));
  return canonicalOrder.filter((c) => present.has(c));
}

export function getProgramOptions(entries: CadEntry[], canonicalOrder: string[]): string[] {
  const present = new Set<string>(entries.map((e) => e.program));
  return canonicalOrder.filter((c) => present.has(c));
}
