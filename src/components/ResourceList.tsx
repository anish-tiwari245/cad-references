"use client";

import { useMemo, useState } from "react";
import type { CadEntry } from "@/lib/types";
import ResourceCard from "./ResourceCard";

export default function ResourceList({ entries }: { entries: CadEntry[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) =>
      `${entry.title} ${entry.assemblyName} ${entry.sourceDomain ?? ""}`.toLowerCase().includes(query)
    );
  }, [entries, search]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-sm text-text-muted">
          {filtered.length} of {entries.length} resources
        </p>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search resources…"
          aria-label="Search resources"
          className="w-full max-w-xs rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border-strong bg-surface px-6 py-20 text-center">
          <p className="text-sm font-medium text-text">Nothing matches that search.</p>
          <p className="mt-1 text-sm text-text-muted">Try a different word.</p>
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
