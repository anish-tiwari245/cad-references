import type { Metadata } from "next";

// Next.js metadata merging is shallow: a page that sets its own `openGraph`
// replaces the whole object rather than merging field by field, so every
// page builds a complete one here instead of relying on inherited defaults.
// See: node_modules/next/dist/docs .../generate-metadata.md#merging
export const SITE_TITLE = "FTC CAD Base";
const OG_IMAGE = { url: "/og-image.png", width: 1200, height: 630, alt: SITE_TITLE };

export function buildMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      siteName: SITE_TITLE,
      title,
      description,
      locale: "en_US",
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE.url],
    },
  };
}
