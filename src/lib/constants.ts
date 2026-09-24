// Oldest-to-newest FTC season order, used to sort the season filter
// newest-first regardless of how many entries mention each one.
const FTC_SEASONS: { name: string; years: string }[] = [
  { name: "Half-Pipe Hustle", years: "2005-2006" },
  { name: "Hangin'-A-Round", years: "2006-2007" },
  { name: "Quad Quandary", years: "2007-2008" },
  { name: "Face Off", years: "2008-2009" },
  { name: "Hot Shot!", years: "2009-2010" },
  { name: "Get Over It!", years: "2010-2011" },
  { name: "Bowled Over!", years: "2011-2012" },
  { name: "Ring It Up!", years: "2012-2013" },
  { name: "Block Party!", years: "2013-2014" },
  { name: "Cascade Effect", years: "2014-2015" },
  { name: "FIRST Res-Q", years: "2015-2016" },
  { name: "Velocity Vortex", years: "2016-2017" },
  { name: "Relic Recovery", years: "2017-2018" },
  { name: "Rover Ruckus", years: "2018-2019" },
  { name: "Skystone", years: "2019-2020" },
  { name: "Ultimate Goal", years: "2020-2021" },
  { name: "Freight Frenzy", years: "2021-2022" },
  { name: "Power Play", years: "2022-2023" },
  { name: "Centerstage", years: "2023-2024" },
  { name: "Into the Deep", years: "2024-2025" },
  { name: "Decode", years: "2025-2026" },
  { name: "Biobuzz", years: "2026-2027" },
];

export const SEASON_ORDER: string[] = FTC_SEASONS.map((s) => s.name);

const SEASON_YEARS: Record<string, string> = Object.fromEntries(
  FTC_SEASONS.map((s) => [s.name, s.years])
);

export const UNSPECIFIED_SEASON = "Unspecified / Offseason";

// Display label for a season value: appends its year range, e.g.
// "Decode" -> "Decode 2025-2026". Falls back to the raw value when there's
// no known year range (e.g. the "Unspecified / Offseason" bucket).
export function formatSeasonLabel(season: string): string {
  const years = SEASON_YEARS[season];
  return years ? `${season} ${years}` : season;
}

export const MECHANISM_TAGS: string[] = [
  "Full Robot",
  "Drivetrain (Mecanum/Tank)",
  "Swerve Drive",
  "Intake",
  "Claw / Gripper",
  "Linear Slides / Extension",
  "Turret",
  "Shooter",
  "Differential / PTO",
  "Dead Axle Wheel",
  "Vector Wheel",
  "Camera Mount",
  "Drone Launcher",
  "Number Plate / Misc",
];

export const CAD_PLATFORMS: string[] = ["Onshape", "Fusion 360", "GrabCAD", "Google Drive", "Other"];

export const PROGRAMS: string[] = ["FTC", "FRC"];
