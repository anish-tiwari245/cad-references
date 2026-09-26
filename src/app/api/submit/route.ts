import { NextResponse } from "next/server";
import { addPending, hitRateLimit } from "@/lib/store";
import { clientIp } from "@/lib/adminAuth";
import {
  cleanHttpUrl,
  cleanOptionalEmail,
  cleanOptionalText,
  cleanPlatform,
  cleanProgram,
  cleanSeason,
  cleanTags,
} from "@/lib/validation";

// Public endpoint: queues a submission for admin review. Nothing here ever
// publishes to the library. Everything is validated again server-side because
// the client-side checks can be bypassed.
const SUBMISSIONS_PER_HOUR = 6;

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return bad("Invalid JSON body.");
  }

  const title = cleanOptionalText(body.title, 120);
  const cadUrl = cleanHttpUrl(body.cadUrl);
  const program = cleanProgram(body.program);
  const season = program ? cleanSeason(program, body.season) : null;
  const tags = cleanTags(body.tags);
  const cadPlatform = cleanPlatform(body.cadPlatform);
  const teamName = cleanOptionalText(body.teamName, 100);
  const contactEmail = cleanOptionalEmail(body.contactEmail);

  if (!title) return bad("A title is required (120 characters max).");
  if (!cadUrl) return bad("CAD link must be a valid http(s) URL.");
  if (!program) return bad("Program must be FTC or FRC.");
  if (!season) return bad("Season is not valid for that program.");
  if (!tags) return bad("Pick at least one valid mechanism tag.");
  if (!cadPlatform) return bad("CAD platform is not valid.");
  if (teamName === undefined) return bad("Team name is too long.");
  if (contactEmail === undefined) return bad("Contact email is not valid.");

  if (await hitRateLimit(`submit:${clientIp(request)}`, SUBMISSIONS_PER_HOUR, 60 * 60)) {
    return bad("Too many submissions from this connection. Try again later.", 429);
  }

  try {
    await addPending({ title, cadUrl, program, season, tags, cadPlatform, teamName, contactEmail });
  } catch (err) {
    console.error("[api/submit] could not queue submission:", err);
    return bad("Could not save the submission right now.", 503);
  }

  return NextResponse.json({ ok: true });
}
