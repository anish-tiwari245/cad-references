import LibraryTabs from "@/components/LibraryTabs";
import ThemeToggle from "@/components/ThemeToggle";
import SubmitCadButton from "@/components/SubmitCadButton";
import { getEntries } from "@/lib/store";
import { getSeasonOptions, getMechanismOptions, getPlatformOptions, getProgramOptions } from "@/lib/data";
import { MECHANISM_TAGS, CAD_PLATFORMS, PROGRAMS } from "@/lib/constants";

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
      <div className="border-b border-border bg-bg">
        <div className="mx-auto flex max-w-7xl items-center gap-2.5 px-4 py-2 text-sm text-text-muted sm:px-6 lg:px-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/stratos-logo.png" alt="31071 Stratos logo" width={32} height={32} className="h-8 w-8 rounded-md" />
          <span>
            Built by <span className="font-medium text-text">31071 Stratos</span>
          </span>
        </div>
      </div>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-text">FTC CAD Base</h1>
            <ThemeToggle />
          </div>
          <SubmitCadButton />
        </div>
      </header>

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
