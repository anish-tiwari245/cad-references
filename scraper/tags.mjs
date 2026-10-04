// Canonical mechanism vocabulary shared by title-based classification and
// Onshape part-tree tagging. Order matters: it is also the priority order used
// to pick a pin's primary category from its title.

export const FULL_ROBOT = "Full Robot";

export const MECHANISM_VOCAB = [
  { tag: "Swerve Drive", re: /swerv|swerb|\bsw\s?mod|\bsdt\b|coax/i },
  { tag: "Differential / PTO", re: /differential|\bdiffy\b|\bdiffies\b|\bdiff\b|\bpto\b|power take.?off/i },
  { tag: "Vector Wheel", re: /vector\s*wheel|\bvector\s*v\d/i },
  { tag: "Claw / Gripper", re: /\bclaws?\b|gripper|grabber/i },
  { tag: "Intake", re: /intake|\bintk/i },
  { tag: "Linear Slides / Extension", re: /\bslides?\b|extendo|\bextension\b|\blift\b|elevator/i },
  { tag: "Turret", re: /turret|\bturr\b/i },
  { tag: "Shooter", re: /shooter|flywheel|\bshoot|indexer/i },
  { tag: "Number Plate / Misc", re: /number\s*plates?|team\s*plates?|sign\s*mounts?/i },
  // Mecanum and tank are mechanically different drivetrains, so they're
  // separate tags. Most pins just say "drivetrain"/"chassis" without saying
  // which kind, so those fall into Unspecified rather than being guessed.
  { tag: "Drivetrain (Mecanum)", re: /mecanum|octocanum|\bmec\b|\blmec\b/i },
  { tag: "Drivetrain (Tank)", re: /\btank\b|\btread|skid.?steer|\b[68]wd\b/i },
  {
    tag: "Drivetrain (Unspecified)",
    re: /drive\s?train|\bdt\b|chassis|drive\s?base/i,
  },
];

// Display/filter order for the site (Full Robot first, then vocabulary).
export const ALL_TAGS = [
  FULL_ROBOT,
  "Drivetrain (Mecanum)",
  "Drivetrain (Tank)",
  "Drivetrain (Unspecified)",
  "Swerve Drive",
  "Intake",
  "Claw / Gripper",
  "Linear Slides / Extension",
  "Turret",
  "Shooter",
  "Differential / PTO",
  "Vector Wheel",
  "Number Plate / Misc",
  "Misc",
  "Other",
];

// Mechanisms dropped from the vocabulary (dead axle/odometry, camera, drone).
// A pin whose only mechanism signal is one of these is filed under "Other"
// instead of defaulting to "Full Robot".
export const RETIRED_PATTERNS = [
  /dead\s*axle|dead\s*wheel|deadwheel|odometry|\bodom|\bodo\b/i,
  /camera|\bcam\b|limelight|webcam|\bt265\b/i,
  /drone/i,
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
  const tags = MECHANISM_VOCAB.filter(({ re }) => re.test(t)).map((v) => v.tag);
  // "Mecanum Drivetrain" matches both the Mecanum pattern and the generic
  // Unspecified one; the specific tag wins, so drop the generic fallback.
  if (tags.includes("Drivetrain (Unspecified)") && (tags.includes("Drivetrain (Mecanum)") || tags.includes("Drivetrain (Tank)"))) {
    return tags.filter((tag) => tag !== "Drivetrain (Unspecified)");
  }
  return tags;
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
