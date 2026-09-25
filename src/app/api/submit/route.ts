import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

// Backup log only. The primary review path is the Formspree email, so this
// file exists in case an email gets missed, per the approval-flow design:
// nothing here ever gets published automatically.
const LOG_PATH = path.join(process.cwd(), "data", "pending-submissions.json");

interface SubmissionPayload {
  cadUrl?: unknown;
  program?: unknown;
  season?: unknown;
  tags?: unknown;
  cadPlatform?: unknown;
  teamName?: unknown;
  contactEmail?: unknown;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function POST(request: Request) {
  let body: SubmissionPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  // Minimal server-side shape check. Full validation already happened
  // client-side; this just guards the log file against garbage.
  if (
    !isNonEmptyString(body.cadUrl) ||
    !isNonEmptyString(body.program) ||
    !isNonEmptyString(body.season) ||
    !isNonEmptyString(body.cadPlatform) ||
    !Array.isArray(body.tags) ||
    body.tags.length === 0
  ) {
    return NextResponse.json({ ok: false, error: "Missing required fields." }, { status: 400 });
  }

  const entry = {
    cadUrl: body.cadUrl,
    program: body.program,
    season: body.season,
    tags: body.tags,
    cadPlatform: body.cadPlatform,
    teamName: isNonEmptyString(body.teamName) ? body.teamName : null,
    contactEmail: isNonEmptyString(body.contactEmail) ? body.contactEmail : null,
    submittedAt: new Date().toISOString(),
  };

  let existing: unknown[] = [];
  try {
    existing = JSON.parse(await readFile(LOG_PATH, "utf-8"));
    if (!Array.isArray(existing)) existing = [];
  } catch {
    existing = [];
  }
  existing.push(entry);

  await mkdir(path.dirname(LOG_PATH), { recursive: true });
  await writeFile(LOG_PATH, JSON.stringify(existing, null, 2), "utf-8");

  return NextResponse.json({ ok: true });
}
