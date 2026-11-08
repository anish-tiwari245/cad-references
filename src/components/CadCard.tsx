import type { CadEntry } from "@/lib/types";
import { formatSeasonLabel } from "@/lib/constants";
import FavoriteButton from "./FavoriteButton";
import ViewCadButton from "./ViewCadButton";

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent";
}) {
  return (
    <span
      className={
        "inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium " +
        (tone === "accent"
          ? "border-accent/30 bg-accent-soft text-accent"
          : "border-border-strong bg-bg text-text-muted")
      }
    >
      {children}
    </span>
  );
}

const MAX_SECONDARY_TAGS = 3;

export default function CadCard({ entry, views = 0 }: { entry: CadEntry; views?: number }) {
  const secondaryTags = entry.tags.filter((t) => t !== entry.primaryCategory);
  const visibleTags = secondaryTags.slice(0, MAX_SECONDARY_TAGS);
  const hiddenTags = secondaryTags.slice(MAX_SECONDARY_TAGS);

  return (
    <article className="flex flex-col overflow-hidden rounded-md border border-border bg-surface transition-shadow hover:shadow-[0_2px_12px_rgba(32,29,26,0.08)]">
      <div className={`relative aspect-[4/3] w-full border-b border-border ${entry.thumbnail ? "bg-white" : "bg-bg"}`}>
        {entry.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.thumbnail}
            alt={`${entry.title} thumbnail`}
            // Renders we fetched from Onshape have wide white margins, so show them whole.
            className={`absolute inset-0 h-full w-full ${entry.thumbnail.startsWith("/api/thumb/") ? "object-contain" : "object-cover"}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-text-muted">
            No preview available
          </div>
        )}
        <FavoriteButton id={entry.id} className="absolute right-1.5 top-1.5 bg-surface/90 shadow-sm backdrop-blur-sm" />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-sm font-semibold leading-snug text-text">{entry.title}</h3>
          {entry.assemblyName && entry.assemblyName !== entry.title && (
            <p className="mt-0.5 text-xs text-text-muted">{entry.assemblyName}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge tone={entry.program === "FRC" ? "accent" : "neutral"}>{entry.program}</Badge>
          <Badge>{formatSeasonLabel(entry.season)}</Badge>
          <Badge>{entry.primaryCategory}</Badge>
        </div>

        {secondaryTags.length > 0 && (
          <p className="-mt-1 text-[11px] leading-snug text-text-muted">
            {visibleTags.join(" · ")}
            {hiddenTags.length > 0 && (
              <span title={hiddenTags.join(", ")}>
                {" · "}
                <span className="underline decoration-dotted underline-offset-2">+{hiddenTags.length} more</span>
              </span>
            )}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wide text-text-muted">{entry.cadPlatform}</span>
            <span className="inline-flex items-center gap-1 font-mono text-xs text-text-muted" title={`${views} view${views === 1 ? "" : "s"}`}>
              <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
                <path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z" />
                <circle cx="10" cy="10" r="2.25" />
              </svg>
              {views}
            </span>
          </div>
          {entry.url ? (
            <ViewCadButton
              id={entry.id}
              url={entry.url}
              className="inline-flex items-center gap-1 rounded-sm border border-accent bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-hover hover:border-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          ) : (
            <span className="text-xs text-text-muted">Source unavailable</span>
          )}
        </div>
      </div>
    </article>
  );
}
