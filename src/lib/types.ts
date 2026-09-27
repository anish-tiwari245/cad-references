export type Program = "FTC" | "FRC";

export type CadPlatform = "Onshape" | "Fusion 360" | "GrabCAD" | "Google Drive" | "Other";

// "cad" is a normal per-robot/per-part CAD file. "resource" is a link that
// isn't one file to open (a website, doc gallery, spreadsheet index, form,
// app-store listing, ...) — it has no mechanism tags or "Full Robot" badge.
export type EntryKind = "cad" | "resource";

export interface CadEntry {
  id: string;
  kind: EntryKind;
  title: string;
  assemblyName: string;
  url: string | null;
  sourceDomain: string | null;
  thumbnail: string | null;
  program: Program;
  season: string;
  primaryCategory: string;
  tags: string[];
  cadPlatform: CadPlatform;
  needsReview: boolean;
  reviewReason: string | null;
}

export interface PendingSubmission {
  id: string;
  kind: EntryKind;
  title: string;
  cadUrl: string;
  program: Program;
  season: string;
  tags: string[];
  cadPlatform: CadPlatform;
  teamName: string | null;
  contactEmail: string | null;
  submittedAt: string;
}
