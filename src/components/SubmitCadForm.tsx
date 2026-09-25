"use client";

import { useState, type FormEvent } from "react";
import ChipGroup from "./ChipGroup";
import { SEASON_ORDER, formatSeasonLabel, getFrcSeasonYears, MECHANISM_TAGS, CAD_PLATFORMS } from "@/lib/constants";

const FTC_SEASON_OPTIONS = [...SEASON_ORDER].reverse();
const FRC_SEASON_OPTIONS = getFrcSeasonYears();

const FIELD_LABEL = "text-xs font-semibold uppercase tracking-wide text-text-muted";
const INPUT =
  "mt-2 w-full rounded-sm border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function fieldBorder(hasError: boolean) {
  return hasError ? "border-red-400 focus:border-red-400" : "border-border-strong focus:border-accent";
}

function toggleInSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

type Status = "idle" | "submitting" | "success" | "error";

export default function SubmitCadForm({ onClose }: { onClose: () => void }) {
  const [cadUrl, setCadUrl] = useState("");
  const [program, setProgram] = useState<"FTC" | "FRC" | "">("");
  const [season, setSeason] = useState("");
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [cadPlatform, setCadPlatform] = useState("");
  const [teamName, setTeamName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const [attempted, setAttempted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const seasonOptions = program === "FRC" ? FRC_SEASON_OPTIONS : FTC_SEASON_OPTIONS;

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};

    const url = cadUrl.trim();
    if (!url) {
      next.cadUrl = "CAD link is required.";
    } else {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          next.cadUrl = "Enter a valid http(s) URL.";
        }
      } catch {
        next.cadUrl = "Enter a valid URL, e.g. https://cad.onshape.com/documents/...";
      }
    }

    if (!program) next.program = "Select a program.";
    if (!season) next.season = "Select a season.";
    if (tags.size === 0) next.tags = "Select at least one mechanism tag.";
    if (!cadPlatform) next.cadPlatform = "Select a CAD platform.";

    const email = contactEmail.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.contactEmail = "Enter a valid email address.";
    }

    return next;
  }

  function resetFields() {
    setCadUrl("");
    setProgram("");
    setSeason("");
    setTags(new Set());
    setCadPlatform("");
    setTeamName("");
    setContactEmail("");
    setHoneypot("");
    setAttempted(false);
    setErrors({});
  }

  function handleProgramChange(next: "FTC" | "FRC") {
    setProgram(next);
    setSeason(""); // season options differ between programs, so the old value would be stale
    if (attempted) setErrors(validate());
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setAttempted(true);
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // Bots that fill every field reveal themselves here; humans never see
    // this field. Pretend success without sending anything.
    if (honeypot.trim()) {
      setStatus("success");
      setStatusMessage("Thanks — this has been sent in for review.");
      resetFields();
      return;
    }

    setStatus("submitting");
    setStatusMessage(null);

    const endpoint = process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT;
    const tagList = [...tags];

    const emailPayload: Record<string, string> = {
      "CAD Link": cadUrl.trim(),
      Program: program,
      Season: season,
      "Mechanism Tags": tagList.join(", "),
      "CAD Platform": cadPlatform,
      "Team Name": teamName.trim() || "(not provided)",
      "Contact Email": contactEmail.trim() || "(not provided)",
      _subject: `New CAD submission${teamName.trim() ? ` — ${teamName.trim()}` : ""}`,
    };
    if (contactEmail.trim()) emailPayload._replyto = contactEmail.trim();

    if (!endpoint) {
      // Stub mode: no Formspree endpoint configured yet. Log what would have
      // been sent so the feature is testable before NEXT_PUBLIC_FORMSPREE_ENDPOINT exists.
      console.warn(
        "[SubmitCadForm] NEXT_PUBLIC_FORMSPREE_ENDPOINT is not set — nothing was sent. Payload:",
        emailPayload
      );
      setStatus("error");
      setStatusMessage("This form isn't finished being set up yet, so nothing was sent. Please try again later.");
      return;
    }

    const backupLogPayload = {
      cadUrl: cadUrl.trim(),
      program,
      season,
      tags: tagList,
      cadPlatform,
      teamName: teamName.trim() || null,
      contactEmail: contactEmail.trim() || null,
    };

    try {
      const [formspreeResult] = await Promise.allSettled([
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(emailPayload),
        }),
        // Backup log only — its success or failure doesn't affect the user-facing result.
        fetch("/api/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(backupLogPayload),
        }).catch((err) => console.error("[SubmitCadForm] backup log write failed:", err)),
      ]);

      if (formspreeResult.status === "fulfilled" && formspreeResult.value.ok) {
        setStatus("success");
        setStatusMessage("Thanks — this has been sent in for review.");
        resetFields();
      } else {
        throw new Error("Formspree submission failed");
      }
    } catch (err) {
      console.error("[SubmitCadForm] submission failed:", err);
      setStatus("error");
      setStatusMessage("Something went wrong sending this — please try again in a moment.");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 10.5 8 14.5 16 6" />
          </svg>
        </div>
        <p className="text-sm font-medium text-text">{statusMessage}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="rounded-sm border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-text hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Submit another
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="relative flex flex-col gap-5">
      <p className="text-sm leading-relaxed text-text-muted">
        Share a link to your team&apos;s CAD and it&apos;ll be reviewed for the library. This sends an email for
        review — it isn&apos;t added automatically.
      </p>

      {/* Honeypot: clipped to zero size (not display:none), so it still
          renders for bots that check computed visibility, but real users
          never see or reach it. */}
      <div className="absolute h-px w-px overflow-hidden whitespace-nowrap" style={{ clip: "rect(0,0,0,0)" }} aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input
          id="company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="cadUrl" className={FIELD_LABEL}>
          CAD link *
        </label>
        <input
          id="cadUrl"
          type="text"
          inputMode="url"
          placeholder="https://cad.onshape.com/documents/..."
          value={cadUrl}
          onChange={(e) => {
            setCadUrl(e.target.value);
            if (attempted) setErrors(validate());
          }}
          className={`${INPUT} ${fieldBorder(!!errors.cadUrl)}`}
          aria-invalid={!!errors.cadUrl}
          aria-describedby={errors.cadUrl ? "cadUrl-error" : undefined}
        />
        {errors.cadUrl && (
          <p id="cadUrl-error" className="mt-1 text-xs text-red-500">
            {errors.cadUrl}
          </p>
        )}
      </div>

      <fieldset>
        <legend className={FIELD_LABEL}>Program *</legend>
        <div className="mt-2 flex gap-4">
          {(["FTC", "FRC"] as const).map((p) => (
            <label key={p} className="inline-flex items-center gap-2 text-sm text-text">
              <input
                type="radio"
                name="program"
                value={p}
                checked={program === p}
                onChange={() => handleProgramChange(p)}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              {p}
            </label>
          ))}
        </div>
        {errors.program && <p className="mt-1 text-xs text-red-500">{errors.program}</p>}
      </fieldset>

      <div>
        <label htmlFor="season" className={FIELD_LABEL}>
          Season *
        </label>
        <select
          id="season"
          value={season}
          onChange={(e) => {
            setSeason(e.target.value);
            if (attempted) setErrors(validate());
          }}
          className={`${INPUT} ${fieldBorder(!!errors.season)}`}
          aria-invalid={!!errors.season}
        >
          <option value="" disabled>
            {program === "FRC" ? "Select a build year" : "Select a season"}
          </option>
          {seasonOptions.map((s) => (
            <option key={s} value={s}>
              {program === "FRC" ? s : formatSeasonLabel(s)}
            </option>
          ))}
        </select>
        {errors.season && <p className="mt-1 text-xs text-red-500">{errors.season}</p>}
      </div>

      <div>
        <ChipGroup
          label="Mechanism tags *"
          options={MECHANISM_TAGS}
          selected={tags}
          onToggle={(v) => {
            setTags((prev) => toggleInSet(prev, v));
            if (attempted) setErrors(validate());
          }}
        />
        {errors.tags && <p className="mt-1 text-xs text-red-500">{errors.tags}</p>}
      </div>

      <div>
        <label htmlFor="cadPlatform" className={FIELD_LABEL}>
          CAD platform *
        </label>
        <select
          id="cadPlatform"
          value={cadPlatform}
          onChange={(e) => {
            setCadPlatform(e.target.value);
            if (attempted) setErrors(validate());
          }}
          className={`${INPUT} ${fieldBorder(!!errors.cadPlatform)}`}
          aria-invalid={!!errors.cadPlatform}
        >
          <option value="" disabled>
            Select a platform
          </option>
          {CAD_PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {errors.cadPlatform && <p className="mt-1 text-xs text-red-500">{errors.cadPlatform}</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="teamName" className={FIELD_LABEL}>
            Team name / number
          </label>
          <input
            id="teamName"
            type="text"
            placeholder="e.g. 11329 I.C.E. Robotics"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className={`${INPUT} ${fieldBorder(false)}`}
          />
        </div>
        <div>
          <label htmlFor="contactEmail" className={FIELD_LABEL}>
            Contact email
          </label>
          <input
            id="contactEmail"
            type="email"
            placeholder="optional"
            value={contactEmail}
            onChange={(e) => {
              setContactEmail(e.target.value);
              if (attempted) setErrors(validate());
            }}
            className={`${INPUT} ${fieldBorder(!!errors.contactEmail)}`}
            aria-invalid={!!errors.contactEmail}
          />
          {errors.contactEmail && <p className="mt-1 text-xs text-red-500">{errors.contactEmail}</p>}
        </div>
      </div>

      {status === "error" && statusMessage && (
        <p className="rounded-sm border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{statusMessage}</p>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-sm border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-text hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "submitting" ? "Sending…" : "Submit for review"}
        </button>
      </div>
    </form>
  );
}
