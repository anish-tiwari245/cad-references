"use client";

import { useMemo, useState } from "react";
import type { CadEntry } from "@/lib/types";
import FilterPanel from "./FilterPanel";
import CadGrid from "./CadGrid";

function toggleInSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export default function CadCatalog({
  entries,
  seasonOptions,
  mechanismOptions,
  platformOptions,
  programOptions,
}: {
  entries: CadEntry[];
  seasonOptions: string[];
  mechanismOptions: string[];
  platformOptions: string[];
  programOptions: string[];
}) {
  const [search, setSearch] = useState("");
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set());
  const [selectedSeason, setSelectedSeason] = useState("all");
  const [selectedMechanisms, setSelectedMechanisms] = useState<Set<string>>(new Set());
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (query) {
        const haystack = `${entry.title} ${entry.assemblyName}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (selectedPrograms.size > 0 && !selectedPrograms.has(entry.program)) return false;
      if (selectedSeason !== "all" && entry.season !== selectedSeason) return false;
      if (selectedMechanisms.size > 0 && !selectedMechanisms.has(entry.mechanismCategory)) return false;
      if (selectedPlatforms.size > 0 && !selectedPlatforms.has(entry.cadPlatform)) return false;
      return true;
    });
  }, [entries, search, selectedPrograms, selectedSeason, selectedMechanisms, selectedPlatforms]);

  const activeFilterCount =
    selectedPrograms.size +
    selectedMechanisms.size +
    selectedPlatforms.size +
    (selectedSeason !== "all" ? 1 : 0) +
    (search.trim() ? 1 : 0);

  function clearAll() {
    setSearch("");
    setSelectedPrograms(new Set());
    setSelectedSeason("all");
    setSelectedMechanisms(new Set());
    setSelectedPlatforms(new Set());
  }

  const filterPanelProps = {
    search,
    onSearchChange: setSearch,
    programOptions,
    selectedPrograms,
    onToggleProgram: (v: string) => setSelectedPrograms((prev) => toggleInSet(prev, v)),
    seasonOptions,
    selectedSeason,
    onSeasonChange: setSelectedSeason,
    mechanismOptions,
    selectedMechanisms,
    onToggleMechanism: (v: string) => setSelectedMechanisms((prev) => toggleInSet(prev, v)),
    platformOptions,
    selectedPlatforms,
    onTogglePlatform: (v: string) => setSelectedPlatforms((prev) => toggleInSet(prev, v)),
    onClearAll: clearAll,
    activeFilterCount,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-4 flex items-center justify-between gap-4 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-2 rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm font-medium text-text hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Filters
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-xs font-semibold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
        <p className="font-mono text-sm text-text-muted">
          {filtered.length} of {entries.length} CAD files
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-10">
        <aside className="hidden lg:block">
          <div className="sticky top-8 rounded-md border border-border bg-surface p-5">
            <FilterPanel {...filterPanelProps} />
          </div>
        </aside>

        <div>
          <div className="mb-4 hidden items-center justify-between lg:flex">
            <p className="font-mono text-sm text-text-muted">
              {filtered.length} of {entries.length} CAD files
            </p>
          </div>
          <CadGrid entries={filtered} />
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-full max-w-xs flex-col bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <span className="text-sm font-semibold text-text">Filters</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close filters"
                className="rounded-sm p-1 text-text-muted hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M1 1L17 17M17 1L1 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <FilterPanel {...filterPanelProps} />
            </div>
            <div className="border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-full rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Show {filtered.length} results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
