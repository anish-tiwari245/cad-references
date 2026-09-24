// Canonical mechanism vocabulary shared by title-based classification and
// Onshape part-tree tagging. Order matters: it is also the priority order used
// to pick a pin's primary category from its title.

export const FULL_ROBOT = "Full Robot";

export const MECHANISM_VOCAB = [
  { tag: "Swerve Drive", re: /swerv|swerb|\bsw\s?mod|\bsdt\b|coax/i },
  { tag: "Differential / PTO", re: /differential|\bdiffy\b|\bdiffies\b|\bdiff\b|\bpto\b|power take.?off/i },
  { tag: "Vector Wheel", re: /vector\s*wheel|\bvector\s*v\d/i },
  { tag: "Dead Axle Wheel", re: /dead\s*axle|dead\s*wheel|deadwheel|odometry|\bodom|\bodo\b/i },
  { tag: "Claw / Gripper", re: /\bclaws?\b|gripper|grabber/i },
  { tag: "Intake", re: /intake|\bintk/i },
  { tag: "Linear Slides / Extension", re: /\bslides?\b|extendo|\bextension\b|\blift\b|elevator/i },
  { tag: "Camera Mount", re: /camera|\bcam\b|limelight|webcam|\bt265\b/i },
  { tag: "Drone Launcher", re: /drone/i },
  { tag: "Turret", re: /turret|\bturr\b/i },
  { tag: "Shooter", re: /shooter|flywheel|\bshoot|indexer/i },
  { tag: "Number Plate / Misc", re: /number\s*plates?|team\s*plates?|sign\s*mounts?/i },
  {
    tag: "Drivetrain (Mecanum/Tank)",
    re: /drive\s?train|\bdt\b|chassis|mecanum|octocanum|drive\s?base|\blmec\b|\b[68]wd\b|\bmec\b/i,
  },
];

// Display/filter order for the site (Full Robot first, then vocabulary).
export const ALL_TAGS = [
  FULL_ROBOT,
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

// "SwerveModule_v3" / "turret-base" -> "Swerve Module v3" / "turret base" so
// word-boundary patterns behave on CAD-style names. Also drops Onshape's
// instance suffix, e.g. "Intake plate <2>".
export function normalizeName(name) {
  return name
    .replace(/<\d+>$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tagsFromText(text) {
  const t = normalizeName(text);
  return MECHANISM_VOCAB.filter(({ re }) => re.test(t)).map((v) => v.tag);
}

// Tags for a list of part/element names, with the names that triggered each.
export function tagsFromNames(names) {
  const evidence = {};
  for (const raw of names) {
    for (const tag of tagsFromText(raw)) {
      (evidence[tag] ||= []);
      if (!evidence[tag].includes(raw)) evidence[tag].push(raw);
    }
  }
  return { tags: Object.keys(evidence), evidence };
}

export function orderTags(tags) {
  const set = new Set(tags);
  return ALL_TAGS.filter((t) => set.has(t));
}
