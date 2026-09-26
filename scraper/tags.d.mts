// Types for tags.mjs so the Next.js app can import the same vocabulary the
// scraper uses instead of keeping a second copy.
export const FULL_ROBOT: string;
export const ALL_TAGS: string[];
export const MECHANISM_VOCAB: { tag: string; re: RegExp }[];
export const RETIRED_PATTERNS: RegExp[];
export function normalizeName(name: string): string;
export function tagsFromText(text: string): string[];
export function tagsFromNames(names: string[]): { tags: string[]; evidence: Record<string, string[]> };
export function orderTags(tags: string[]): string[];
