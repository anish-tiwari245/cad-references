import CadCatalog from "@/components/CadCatalog";
import { getCadEntries, getSeasonOptions, getMechanismOptions, getPlatformOptions, getProgramOptions } from "@/lib/data";
import { MECHANISM_CATEGORIES, CAD_PLATFORMS, PROGRAMS } from "@/lib/constants";

export default function Home() {
  const entries = getCadEntries();
  const seasonOptions = getSeasonOptions(entries);
  const mechanismOptions = getMechanismOptions(entries, MECHANISM_CATEGORIES);
  const platformOptions = getPlatformOptions(entries, CAD_PLATFORMS);
  const programOptions = getProgramOptions(entries, PROGRAMS);

  return (
    <main>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-8">
          <h1 className="text-3xl font-semibold tracking-tight text-text">FTC CAD References</h1>
          <p className="max-w-md text-sm leading-relaxed text-text-muted md:text-right">
            Robot CAD shared by FIRST teams. Each entry links to the original file on Onshape, Fusion 360,
            GrabCAD, or Google Drive.
          </p>
        </div>
      </header>

      <CadCatalog
        entries={entries}
        seasonOptions={seasonOptions}
        mechanismOptions={mechanismOptions}
        platformOptions={platformOptions}
        programOptions={programOptions}
      />
    </main>
  );
}
