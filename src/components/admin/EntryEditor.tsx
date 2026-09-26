"use client";

import { useEffect, useRef, useState } from "react";
import ChipGroup from "../ChipGroup";
import { BTN_OUTLINE, BTN_SOLID, INPUT, LABEL } from "./adminStyles";
import { CAD_PLATFORMS, MECHANISM_TAGS, SEASON_ORDER, formatSeasonLabel, getFrcSeasonYears } from "@/lib/constants";

export interface EntryValues {
  title: string;
  assemblyName: string;
  program: string;
  season: string;
  cadPlatform: string;
  tags: string[];
  primaryCategory: string;
  thumbnail: string;
  cadUrl: string;
}

type Preview =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "skipped" }
  | { status: "error"; message: string }
  | {
      status: "done";
      detected: string[];
      evidence: Record<string, string[]>;
      tagSource: string | null;
      tagError: string | null;
      thumbnailError: string | null;
    };

function toggle(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function seasonChoices(program: string, current: string): string[] {
  const base = program === "FRC" ? getFrcSeasonYears(15) : [...SEASON_ORDER].reverse();
  return current && !base.includes(current) ? [current, ...base] : base;
}

function PreviewNote({ preview }: { preview: Preview }) {
  if (preview.status === "idle") return null;

  let body: React.ReactNode;
  if (preview.status === "loading") {
    body = "Reading the Onshape document…";
  } else if (preview.status === "skipped") {
    body = "Not an Onshape link, so no thumbnail or tags are fetched automatically. Add a thumbnail URL below if you want one.";
  } else if (preview.status === "error") {
    body = `Could not run the Onshape lookup: ${preview.message} Tags and thumbnail are as entered.`;
  } else {
    const where = preview.tagSource === "assembly-tree" ? "the assembly tree" : "the document's part names";
    body = (
      <>
        {preview.tagError ? (
          <p>Could not auto-detect tags: {preview.tagError} Tags are as entered.</p>
        ) : preview.detected.length === 0 ? (
          <p>No mechanisms found in the CAD. Tags are as entered.</p>
        ) : (
          <>
            <p>
              Detected from {where} and checked above: <span className="font-medium text-text">{preview.detected.join(", ")}</span>. Uncheck
              any that are wrong.
            </p>
            <details className="mt-1">
              <summary className="cursor-pointer">Show the parts they came from</summary>
              <ul className="mt-1 list-disc pl-5">
                {Object.entries(preview.evidence).map(([tag, names]) => (
                  <li key={tag}>
                    <span className="font-medium text-text">{tag}:</span> {names.join(", ")}
                  </li>
                ))}
              </ul>
            </details>
          </>
        )}
        {preview.thumbnailError && <p className="mt-1">No thumbnail fetched: {preview.thumbnailError}</p>}
      </>
    );
  }

  return (
    <div role="status" className="rounded-sm border border-border bg-bg px-3 py-2 text-xs text-text-muted">
      {body}
    </div>
  );
}

// The full form for one library entry. Used to review a submission before
// approving it, and to add a file by hand. For Onshape links it fetches the
// thumbnail and detects mechanisms from the real assembly tree.
export default function EntryEditor({
  id,
  initial,
  autoPreview,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
}: {
  id: string;
  initial: { title: string; cadUrl: string; program: string; season: string; cadPlatform: string; tags: string[] };
  autoPreview: boolean;
  submitLabel: string;
  busy: boolean;
  onSubmit: (values: EntryValues) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [assemblyName, setAssemblyName] = useState("");
  const [program, setProgram] = useState(initial.program);
  const [season, setSeason] = useState(initial.season || seasonChoices(initial.program, "")[0]);
  const [cadPlatform, setCadPlatform] = useState(initial.cadPlatform);
  const [tags, setTags] = useState<Set<string>>(new Set(initial.tags));
  const [primary, setPrimary] = useState(initial.tags.includes("Full Robot") ? "Full Robot" : (initial.tags[0] ?? ""));
  const [thumbnail, setThumbnail] = useState("");
  const [cadUrl, setCadUrl] = useState(initial.cadUrl);
  const [preview, setPreview] = useState<Preview>({ status: "idle" });
  const lastPreviewedUrl = useRef(autoPreview ? initial.cadUrl.trim() : "");
  const started = useRef(false);

  const tagList = MECHANISM_TAGS.filter((t) => tags.has(t));
  const effectivePrimary = tags.has(primary) ? primary : (tagList[0] ?? "");
  const fid = (name: string) => `${name}-${id}`;

  async function runPreview(force: boolean) {
    const url = cadUrl.trim();
    if (!url) return;
    lastPreviewedUrl.current = url;
    setPreview({ status: "loading" });
    try {
      const res = await fetch("/api/admin/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, cadUrl: url, force }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPreview({ status: "error", message: data.error ?? "Lookup failed." });
        return;
      }
      if (!data.onshape) {
        // A previously fetched Onshape image no longer belongs to this link.
        setThumbnail((prev) => (prev.startsWith("/api/thumb/") ? "" : prev));
        setPreview({ status: "skipped" });
        return;
      }
      if (data.thumbnail && (force || !thumbnail)) setThumbnail(data.thumbnail);
      if (Array.isArray(data.tags) && data.tags.length > 0) setTags((prev) => new Set([...prev, ...data.tags]));
      setPreview({
        status: "done",
        detected: data.tags ?? [],
        evidence: data.evidence ?? {},
        tagSource: data.tagSource ?? null,
        tagError: data.tagError ?? null,
        thumbnailError: data.thumbnailError ?? null,
      });
    } catch {
      setPreview({ status: "error", message: "Could not reach the server." });
    }
  }

  useEffect(() => {
    if (!autoPreview || started.current) return;
    started.current = true;
    void runPreview(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeProgram(next: string) {
    setProgram(next);
    setSeason(seasonChoices(next, "")[0]);
  }

  const canSubmit = !busy && preview.status !== "loading" && tagList.length > 0 && title.trim() !== "" && cadUrl.trim() !== "";

  return (
    <div className="grid gap-4 border-t border-border pt-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor={fid("title")}>
            Title *
          </label>
          <input id={fid("title")} value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT} placeholder="e.g. Decode Robot" />
        </div>
        <div>
          <label className={LABEL} htmlFor={fid("assembly")}>
            Assembly name
          </label>
          <input id={fid("assembly")} value={assemblyName} onChange={(e) => setAssemblyName(e.target.value)} className={INPUT} placeholder="defaults to the title" />
        </div>
        <div className="sm:col-span-2">
          <label className={LABEL} htmlFor={fid("url")}>
            CAD link *
          </label>
          <input
            id={fid("url")}
            value={cadUrl}
            onChange={(e) => setCadUrl(e.target.value)}
            onBlur={() => {
              if (cadUrl.trim() && cadUrl.trim() !== lastPreviewedUrl.current) void runPreview(true);
            }}
            className={INPUT}
            placeholder="https://cad.onshape.com/documents/..."
          />
        </div>
        <div>
          <label className={LABEL} htmlFor={fid("program")}>
            Program
          </label>
          <select id={fid("program")} value={program} onChange={(e) => changeProgram(e.target.value)} className={INPUT}>
            <option>FTC</option>
            <option>FRC</option>
          </select>
        </div>
        <div>
          <label className={LABEL} htmlFor={fid("season")}>
            Season
          </label>
          <select id={fid("season")} value={season} onChange={(e) => setSeason(e.target.value)} className={INPUT}>
            {seasonChoices(program, season).map((s) => (
              <option key={s} value={s}>
                {program === "FTC" ? formatSeasonLabel(s) : s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL} htmlFor={fid("platform")}>
            CAD platform
          </label>
          <select id={fid("platform")} value={cadPlatform} onChange={(e) => setCadPlatform(e.target.value)} className={INPUT}>
            {CAD_PLATFORMS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL} htmlFor={fid("primary")}>
            Primary category (badge)
          </label>
          <select id={fid("primary")} value={effectivePrimary} onChange={(e) => setPrimary(e.target.value)} className={INPUT}>
            {tagList.length === 0 && <option value="">Pick a tag first</option>}
            {tagList.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <ChipGroup label="Tags" options={MECHANISM_TAGS} selected={tags} onToggle={(v) => setTags((prev) => toggle(prev, v))} />
      <PreviewNote preview={preview} />

      <div>
        <label className={LABEL} htmlFor={fid("thumb")}>
          Thumbnail image URL (optional)
        </label>
        <input id={fid("thumb")} value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} className={INPUT} placeholder="https://..." />
        {thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail} alt="Thumbnail preview" className="mt-2 h-24 rounded-sm border border-border bg-white object-contain" />
        )}
        <button type="button" disabled={preview.status === "loading" || !cadUrl.trim()} onClick={() => void runPreview(true)} className={`${BTN_OUTLINE} mt-2 block`}>
          Fetch from Onshape again
        </button>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={BTN_OUTLINE}>
          Cancel
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() =>
            onSubmit({ title, assemblyName, program, season, cadPlatform, tags: tagList, primaryCategory: effectivePrimary, thumbnail, cadUrl })
          }
          className={BTN_SOLID}
        >
          {busy ? "Working…" : submitLabel}
        </button>
      </div>
    </div>
  );
}
