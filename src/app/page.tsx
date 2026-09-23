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
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            FTC / FRC CAD Reference Library
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
            A community reference library of FIRST Robotics CAD files — full robots, drivetrains, swerve
            modules, intakes, claws, and more — linked back to their original Onshape, Fusion 360, GrabCAD,
            and Google Drive sources.
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
