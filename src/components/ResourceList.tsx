"use client";

import { useMemo, useState } from "react";
import type { CadEntry } from "@/lib/types";
import ResourceCard from "./ResourceCard";
import { useFavorites } from "@/lib/useFavorites";

export default function ResourceList({ entries }: { entries: CadEntry[] }) {
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const { favorites } = useFavorites();

  const favoritedCount = useMemo(() => entries.filter((e) => favorites.has(e.id)).length, [entries, favorites]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (favoritesOnly && !favorites.has(entry.id)) return false;
      if (query && !`${entry.title} ${entry.assemblyName} ${entry.sourceDomain ?? ""}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [entries, search, favoritesOnly, favorites]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-sm text-text-muted">
          {filtered.length} of {entries.length} resources
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            aria-pressed={favoritesOnly}
            disabled={favoritedCount === 0 && !favoritesOnly}
            onClick={() => setFavoritesOnly((prev) => !prev)}
            className={
              "flex shrink-0 items-center justify-center gap-1.5 rounded-sm border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 " +
              (favoritesOnly
                ? "border-accent bg-accent text-white"
                : "border-border-strong bg-surface text-text hover:border-accent/50 hover:text-accent")
            }
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill={favoritesOnly ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
              <path d="M10 2.5 12.3 7.4 17.6 8 13.8 11.7 14.9 17 10 14.6 5.1 17 6.2 11.7 2.4 8 7.7 7.4Z" />
            </svg>
            Favorites {favoritedCount > 0 && `(${favoritedCount})`}
          </button>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources…"
            aria-label="Search resources"
            className="w-full max-w-xs rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border-strong bg-surface px-6 py-20 text-center">
          <p className="text-sm font-medium text-text">
            {favoritesOnly ? "No favorites yet." : "Nothing matches that search."}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            {favoritesOnly ? "Star a resource to save it here." : "Try a different word."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => (
            <ResourceCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
