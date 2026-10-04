import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getEntries } from "@/lib/store";
import { MECHANISM_SLUGS, SEASON_SLUGS } from "@/lib/categories";

// The library lives in Redis and changes whenever the admin approves or
// deletes something, so this always reflects the live set of category/season
// pages that currently have at least one entry (an empty page still exists
// and is reachable, it's just not advertised to crawlers as thin content).
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await getEntries();
  const cadEntries = entries.filter((e) => e.kind !== "resource");
  const now = new Date();

  const categoryUrls: MetadataRoute.Sitemap = MECHANISM_SLUGS.filter(({ value }) => cadEntries.some((e) => e.tags.includes(value))).map(
    ({ slug }) => ({
      url: `${SITE_URL}/category/${slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })
  );

  const seasonUrls: MetadataRoute.Sitemap = SEASON_SLUGS.filter(
    ({ value }) => cadEntries.some((e) => e.program === "FTC" && e.season === value)
  ).map(({ slug }) => ({
    url: `${SITE_URL}/season/${slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    ...categoryUrls,
    ...seasonUrls,
  ];
}
