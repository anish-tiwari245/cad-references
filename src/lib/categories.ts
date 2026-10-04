// URL slugs for the indexable /category/[slug] and /season/[slug] pages.
// Built from the same canonical lists the filters use, so a page always
// exists for every mechanism tag and FTC season the site already knows about.
import { MECHANISM_TAGS, SEASON_ORDER } from "./constants";

function slugify(value: string): string {
  return value
    .replace(/['’]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface SlugEntry {
  value: string;
  slug: string;
}

export const MECHANISM_SLUGS: SlugEntry[] = MECHANISM_TAGS.map((value) => ({ value, slug: slugify(value) }));
export const SEASON_SLUGS: SlugEntry[] = SEASON_ORDER.map((value) => ({ value, slug: slugify(value) }));

export function mechanismTagFromSlug(slug: string): string | null {
  return MECHANISM_SLUGS.find((e) => e.slug === slug)?.value ?? null;
}

export function seasonFromSlug(slug: string): string | null {
  return SEASON_SLUGS.find((e) => e.slug === slug)?.value ?? null;
}

export function slugForMechanismTag(tag: string): string {
  return MECHANISM_SLUGS.find((e) => e.value === tag)?.slug ?? slugify(tag);
}

export function slugForSeason(season: string): string {
  return SEASON_SLUGS.find((e) => e.value === season)?.slug ?? slugify(season);
}
