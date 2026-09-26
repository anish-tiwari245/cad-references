"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "../ThemeToggle";
import EntryEditor, { type EntryValues } from "./EntryEditor";
import { BTN_OUTLINE, BTN_SOLID, INPUT } from "./adminStyles";
import { formatSeasonLabel } from "@/lib/constants";
import { normalizeUrl } from "@/lib/validation";
import type { CadEntry, PendingSubmission } from "@/lib/types";

type Notice = { kind: "ok" | "error"; text: string } | null;
type Send = (path: string, body: Record<string, unknown>, successText: string) => Promise<boolean>;

function PendingCard({
  submission,
  duplicateOf,
  busy,
  send,
}: {
  submission: PendingSubmission;
  duplicateOf: CadEntry | undefined;
  busy: boolean;
  send: Send;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const title = submission.title?.trim() || "(no title)";

  return (
    <li className="rounded-md border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text">{title}</h3>
          <a
            href={submission.cadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 block break-all text-sm text-accent underline-offset-2 hover:underline"
          >
            {submission.cadUrl}
          </a>
          <p className="mt-1 text-xs text-text-muted">
            {submission.program} · {submission.program === "FTC" ? formatSeasonLabel(submission.season) : submission.season} ·{" "}
            {submission.cadPlatform}
          </p>
          <p className="mt-1 text-xs text-text-muted">{submission.tags.join(", ")}</p>
          <p className="mt-1 text-xs text-text-muted">
            {submission.teamName ?? "No team given"}
            {submission.contactEmail && (
              <>
                {" · "}
                <a className="underline-offset-2 hover:underline" href={`mailto:${submission.contactEmail}`}>
                  {submission.contactEmail}
                </a>
              </>
            )}
            {" · "}
            <span suppressHydrationWarning>{new Date(submission.submittedAt).toLocaleString()}</span>
          </p>
          {duplicateOf && (
            <p className="mt-2 inline-block rounded-sm border border-red-300 bg-red-50 px-2 py-0.5 text-xs text-red-700">
              Already in the library as &quot;{duplicateOf.title}&quot;
            </p>
          )}
        </div>

        {!editing && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {confirmDecline ? (
              <>
                <span className="text-xs text-text-muted">Decline this?</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void send("/api/admin/decline", { id: submission.id }, `Declined "${title}".`)}
                  className={BTN_SOLID}
                >
                  Yes, decline
                </button>
                <button type="button" onClick={() => setConfirmDecline(false)} className={BTN_OUTLINE}>
                  Keep
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy || !submission.title?.trim()}
                  onClick={() => void send("/api/admin/approve", { id: submission.id, quick: true }, `Approved "${title}". It is now live.`)}
                  className={BTN_SOLID}
                >
                  {busy ? "Working…" : "Approve"}
                </button>
                <button type="button" onClick={() => setEditing(true)} className={BTN_OUTLINE}>
                  Review and edit
                </button>
                <button type="button" onClick={() => setConfirmDecline(true)} className={BTN_OUTLINE}>
                  Decline
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {editing && (
        <div className="mt-4">
          <EntryEditor
            id={submission.id}
            initial={{
              title: submission.title ?? "",
              cadUrl: submission.cadUrl,
              program: submission.program,
              season: submission.season,
              cadPlatform: submission.cadPlatform,
              tags: submission.tags,
            }}
            autoPreview
            submitLabel="Approve and publish"
            busy={busy}
            onCancel={() => setEditing(false)}
            onSubmit={(v: EntryValues) => void send("/api/admin/approve", { id: submission.id, ...v }, `Approved "${v.title.trim()}". It is now live.`)}
          />
        </div>
      )}
    </li>
  );
}

function LibraryRow({ entry, busy, send }: { entry: CadEntry; busy: boolean; send: Send }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <li className="flex items-center gap-3 border-b border-border py-2 last:border-b-0">
      {entry.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={entry.thumbnail} alt="" className="h-10 w-14 shrink-0 rounded-sm border border-border bg-white object-contain" />
      ) : (
        <div className="h-10 w-14 shrink-0 rounded-sm border border-border bg-bg" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">
          {entry.title}
          {entry.assemblyName !== entry.title && <span className="font-normal text-text-muted"> | {entry.assemblyName}</span>}
        </p>
        <p className="truncate text-xs text-text-muted">
          {entry.program} · {entry.primaryCategory} · {entry.cadPlatform}
        </p>
      </div>
      {confirming ? (
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-text-muted">Delete?</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void send("/api/admin/delete", { id: entry.id }, `Deleted "${entry.title}".`)}
            className={BTN_SOLID}
          >
            Yes, delete
          </button>
          <button type="button" onClick={() => setConfirming(false)} className={BTN_OUTLINE}>
            Keep
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          {entry.url && (
            <a href={entry.url} target="_blank" rel="noopener noreferrer" className={BTN_OUTLINE}>
              Open
            </a>
          )}
          <button type="button" onClick={() => setConfirming(true)} className={BTN_OUTLINE}>
            Delete
          </button>
        </div>
      )}
    </li>
  );
}

const PAGE_SIZE = 60;

// Ids for files the admin adds by hand; must match ADD_ID_RE on the server.
function newDraftId(): string {
  return `add-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export default function AdminPanel({ pending, entries }: { pending: PendingSubmission[]; entries: CadEntry[] }) {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [draftId, setDraftId] = useState("");

  const byUrl = useMemo(() => {
    const map = new Map<string, CadEntry>();
    for (const e of entries) if (e.url) map.set(normalizeUrl(e.url), e);
    return map;
  }, [entries]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => `${e.title} ${e.assemblyName} ${e.url ?? ""}`.toLowerCase().includes(q));
  }, [entries, query]);

  const send: Send = async (path, body, successText) => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.refresh();
        return false;
      }
      if (!res.ok) {
        setNotice({ kind: "error", text: data.error ?? "That did not work." });
        return false;
      }
      setNotice({ kind: "ok", text: successText });
      router.refresh();
      return true;
    } catch {
      setNotice({ kind: "error", text: "Could not reach the server." });
      return false;
    } finally {
      setBusy(false);
    }
  };

  async function addFile(values: EntryValues) {
    const ok = await send("/api/admin/add", { id: draftId, ...values }, `Added "${values.title.trim()}". It is now live.`);
    if (ok) setAdding(false);
  }

  async function signOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-text">Admin</h1>
        <div className="flex items-center gap-2">
          <a href="/" className={BTN_OUTLINE}>
            View site
          </a>
          <button type="button" onClick={() => void signOut()} className={BTN_OUTLINE}>
            Sign out
          </button>
          <ThemeToggle />
        </div>
      </header>

      <nav className="mt-4 flex flex-wrap gap-4 text-sm">
        <a href="#pending" className="text-accent underline-offset-2 hover:underline">
          Pending ({pending.length})
        </a>
        <a href="#add" className="text-accent underline-offset-2 hover:underline">
          Add a file
        </a>
        <a href="#library" className="text-accent underline-offset-2 hover:underline">
          Library and delete ({entries.length})
        </a>
      </nav>

      {notice && (
        <p
          role="status"
          className={
            "mt-4 rounded-sm border px-3 py-2 text-sm " +
            (notice.kind === "ok" ? "border-border-strong bg-accent-soft text-text" : "border-red-300 bg-red-50 text-red-700")
          }
        >
          {notice.text}
        </p>
      )}

      <section id="pending" className="mt-8 scroll-mt-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Pending submissions ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-border-strong bg-surface px-4 py-8 text-center text-sm text-text-muted">
            Nothing waiting for review.
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-text-muted">
              Approve publishes it as submitted (Onshape links also get an automatic thumbnail and any mechanisms found in the assembly). Use
              Review and edit to change anything first.
            </p>
            <ul className="mt-3 grid gap-3">
              {pending.map((s) => (
                <PendingCard key={s.id} submission={s} duplicateOf={byUrl.get(normalizeUrl(s.cadUrl))} busy={busy} send={send} />
              ))}
            </ul>
          </>
        )}
      </section>

      <section id="add" className="mt-10 scroll-mt-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Add a file</h2>
        {adding ? (
          <div className="mt-3 rounded-md border border-border bg-surface p-4">
            <EntryEditor
              key={draftId}
              id={draftId}
              initial={{ title: "", cadUrl: "", program: "FTC", season: "", cadPlatform: "Onshape", tags: [] }}
              autoPreview={false}
              submitLabel="Add to library"
              busy={busy}
              onCancel={() => setAdding(false)}
              onSubmit={(v) => void addFile(v)}
            />
          </div>
        ) : (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                setDraftId(newDraftId());
                setAdding(true);
              }}
              className={BTN_OUTLINE}
            >
              Add a file to the library
            </button>
          </div>
        )}
      </section>

      <section id="library" className="mt-10 scroll-mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Library ({entries.length})</h2>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search to find a file to delete…"
            aria-label="Search library"
            className={`${INPUT} mt-0 max-w-xs`}
          />
        </div>
        <ul className="mt-3 rounded-md border border-border bg-surface px-4">
          {matches.slice(0, PAGE_SIZE).map((e) => (
            <LibraryRow key={e.id} entry={e} busy={busy} send={send} />
          ))}
          {matches.length === 0 && <li className="py-6 text-center text-sm text-text-muted">No entries match.</li>}
        </ul>
        {matches.length > PAGE_SIZE && (
          <p className="mt-2 text-xs text-text-muted">
            Showing {PAGE_SIZE} of {matches.length}. Search to narrow it down.
          </p>
        )}
      </section>
    </div>
  );
}
