import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// The whole catalog (CAD files, resources, filters) lives on one page, so
// there's only one public URL to list. /admin is excluded: it's behind a
// login and already marked noindex on its own page metadata.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
