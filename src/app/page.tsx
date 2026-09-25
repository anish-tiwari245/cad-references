import CadCatalog from "@/components/CadCatalog";
import ThemeToggle from "@/components/ThemeToggle";
import SubmitCadButton from "@/components/SubmitCadButton";
import { getCadEntries, getSeasonOptions, getMechanismOptions, getPlatformOptions, getProgramOptions } from "@/lib/data";
import { MECHANISM_TAGS, CAD_PLATFORMS, PROGRAMS } from "@/lib/constants";

export default function Home() {
  const entries = getCadEntries();
  const seasonOptions = getSeasonOptions(entries);
  const mechanismOptions = getMechanismOptions(entries, MECHANISM_TAGS);
  const platformOptions = getPlatformOptions(entries, CAD_PLATFORMS);
  const programOptions = getProgramOptions(entries, PROGRAMS);

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
            <h1 className="text-3xl font-semibold tracking-tight text-text">FTC CAD Library</h1>
            <ThemeToggle />
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <p className="max-w-md text-sm leading-relaxed text-text-muted md:text-right">
              Robot CAD shared by FIRST teams. Each entry links to the original file on Onshape, Fusion 360,
              GrabCAD, or Google Drive.
            </p>
            <SubmitCadButton />
          </div>
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
