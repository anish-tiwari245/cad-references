import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import LibraryTabs from "@/components/LibraryTabs";
import { getEntries } from "@/lib/store";
import { getSeasonOptions, getMechanismOptions, getPlatformOptions, getProgramOptions } from "@/lib/data";
import { MECHANISM_TAGS, CAD_PLATFORMS, PROGRAMS } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "FTC & FRC CAD Files Library | FTC CAD Base",
  description:
    "FTC and FRC CAD files from real teams: swerve drive, turret, intake, and linear slides designs. Search by season or mechanism, open in Onshape or Fusion 360.",
  path: "/",
});

// The library lives in Redis and the admin can change it any time, so render per request
// (approvals and deletions show up immediately).
export const dynamic = "force-dynamic";

export default async function Home() {
  const entries = await getEntries();
  // Resources (websites, doc galleries, spreadsheets, ...) live on their own
  // tab and don't have mechanism tags, so filter options only look at CAD files.
  const cadEntries = entries.filter((e) => e.kind !== "resource");
  const resourceEntries = entries.filter((e) => e.kind === "resource");
  const seasonOptions = getSeasonOptions(cadEntries);
  const mechanismOptions = getMechanismOptions(cadEntries, MECHANISM_TAGS);
  const platformOptions = getPlatformOptions(cadEntries, CAD_PLATFORMS);
  const programOptions = getProgramOptions(cadEntries, PROGRAMS);

  return (
    <main>
      <SiteHeader titleAs="h1" />

      <LibraryTabs
        cadEntries={cadEntries}
        resourceEntries={resourceEntries}
        seasonOptions={seasonOptions}
        mechanismOptions={mechanismOptions}
        platformOptions={platformOptions}
        programOptions={programOptions}
      />
    </main>
  );
}
