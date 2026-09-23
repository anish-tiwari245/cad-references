import type { CadEntry } from "@/lib/types";
import CadCard from "./CadCard";

export default function CadGrid({ entries }: { entries: CadEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border-strong bg-surface px-6 py-20 text-center">
        <p className="text-sm font-medium text-text">No CAD files match these filters.</p>
        <p className="mt-1 text-sm text-text-muted">Try clearing a filter or broadening your search.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {entries.map((entry) => (
        <CadCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
