"use client";

import { useState } from "react";
import CadCatalog from "./CadCatalog";
import ResourceList from "./ResourceList";
import type { CadEntry } from "@/lib/types";

export default function LibraryTabs({
  cadEntries,
  resourceEntries,
  seasonOptions,
  mechanismOptions,
  platformOptions,
  programOptions,
}: {
  cadEntries: CadEntry[];
  resourceEntries: CadEntry[];
  seasonOptions: string[];
  mechanismOptions: string[];
  platformOptions: string[];
  programOptions: string[];
}) {
  const [tab, setTab] = useState<"cad" | "resources">("cad");

  const tabButton = (value: "cad" | "resources", label: string) => (
    <button
      type="button"
      onClick={() => setTab(value)}
      aria-current={tab === value ? "page" : undefined}
      className={
        "border-b-2 px-1 pb-3 text-sm font-medium transition-colors " +
        (tab === value ? "border-accent text-text" : "border-transparent text-text-muted hover:text-text")
      }
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
        <div className="flex gap-6 border-b border-border">
          {tabButton("cad", `CAD Files (${cadEntries.length})`)}
          {tabButton("resources", `Resources (${resourceEntries.length})`)}
        </div>
      </div>

      {tab === "cad" ? (
        <CadCatalog
          entries={cadEntries}
          seasonOptions={seasonOptions}
          mechanismOptions={mechanismOptions}
          platformOptions={platformOptions}
          programOptions={programOptions}
        />
      ) : (
        <ResourceList entries={resourceEntries} />
      )}
    </div>
  );
}
