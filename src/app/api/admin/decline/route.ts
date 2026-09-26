import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { declinePending } from "@/lib/store";

export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ ok: false, error: "Missing id." }, { status: 400 });

  const removed = await declinePending(id);
  if (!removed) return NextResponse.json({ ok: false, error: "That submission no longer exists." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
