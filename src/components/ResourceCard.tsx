import type { CadEntry } from "@/lib/types";
import FavoriteButton from "./FavoriteButton";

export default function ResourceCard({ entry }: { entry: CadEntry }) {
  return (
    <article className="flex flex-col justify-between gap-3 rounded-md border border-border bg-surface p-4 transition-shadow hover:shadow-[0_2px_12px_rgba(32,29,26,0.08)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-snug text-text">{entry.title}</h3>
          {entry.assemblyName && entry.assemblyName !== entry.title && (
            <p className="mt-0.5 text-xs text-text-muted">{entry.assemblyName}</p>
          )}
        </div>
        <FavoriteButton id={entry.id} className="-mr-1.5 -mt-1 shrink-0" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="truncate font-mono text-xs text-text-muted">{entry.sourceDomain ?? "resource"}</span>
        {entry.url ? (
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-accent bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-hover hover:border-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Visit
          </a>
        ) : (
          <span className="text-xs text-text-muted">Link unavailable</span>
        )}
      </div>
    </article>
  );
}
