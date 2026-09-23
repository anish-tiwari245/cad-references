export type Program = "FTC" | "FRC";

export type CadPlatform = "Onshape" | "Fusion 360" | "GrabCAD" | "Google Drive" | "Other";

export interface CadEntry {
  id: string;
  title: string;
  assemblyName: string;
  url: string | null;
  sourceDomain: string | null;
  thumbnail: string | null;
  program: Program;
  season: string;
  mechanismCategory: string;
  cadPlatform: CadPlatform;
  needsReview: boolean;
  reviewReason: string | null;
}
