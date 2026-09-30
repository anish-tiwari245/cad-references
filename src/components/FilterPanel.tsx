import ChipGroup from "./ChipGroup";
import { formatSeasonLabel } from "@/lib/constants";

export interface FilterPanelProps {
  search: string;
  onSearchChange: (value: string) => void;
  programOptions: string[];
  selectedPrograms: Set<string>;
  onToggleProgram: (value: string) => void;
  seasonOptions: string[];
  selectedSeason: string;
  onSeasonChange: (value: string) => void;
  mechanismOptions: string[];
  selectedMechanisms: Set<string>;
  onToggleMechanism: (value: string) => void;
  platformOptions: string[];
  selectedPlatforms: Set<string>;
  onTogglePlatform: (value: string) => void;
  favoritesOnly: boolean;
  onToggleFavoritesOnly: () => void;
  favoritedCount: number;
  onClearAll: () => void;
  activeFilterCount: number;
}

export default function FilterPanel({
  search,
  onSearchChange,
  programOptions,
  selectedPrograms,
  onToggleProgram,
  seasonOptions,
  selectedSeason,
  onSeasonChange,
  mechanismOptions,
  selectedMechanisms,
  onToggleMechanism,
  platformOptions,
  selectedPlatforms,
  onTogglePlatform,
  favoritesOnly,
  onToggleFavoritesOnly,
  favoritedCount,
  onClearAll,
  activeFilterCount,
}: FilterPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Filters</h2>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-medium text-accent underline-offset-2 hover:underline"
          >
            Clear all ({activeFilterCount})
          </button>
        )}
      </div>

      <button
        type="button"
        aria-pressed={favoritesOnly}
        disabled={favoritedCount === 0 && !favoritesOnly}
        onClick={onToggleFavoritesOnly}
        className={
          "flex items-center justify-center gap-1.5 rounded-sm border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 " +
          (favoritesOnly
            ? "border-accent bg-accent text-white"
            : "border-border-strong bg-surface text-text hover:border-accent/50 hover:text-accent")
        }
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill={favoritesOnly ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
          <path d="M10 2.5 12.3 7.4 17.6 8 13.8 11.7 14.9 17 10 14.6 5.1 17 6.2 11.7 2.4 8 7.7 7.4Z" />
        </svg>
        Favorites only {favoritedCount > 0 && `(${favoritedCount})`}
      </button>

      <div>
        <label htmlFor="search" className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Search
        </label>
        <input
          id="search"
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Title, assembly, or category…"
          className="mt-2 w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </div>

      <ChipGroup
        label="Program"
        options={programOptions}
        selected={selectedPrograms}
        onToggle={onToggleProgram}
      />

      <div>
        <label htmlFor="season" className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Season
        </label>
        <select
          id="season"
          value={selectedSeason}
          onChange={(e) => onSeasonChange(e.target.value)}
          className="mt-2 w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm text-text focus:border-accent focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <option value="all">All seasons</option>
          {seasonOptions.map((season) => (
            <option key={season} value={season}>
              {formatSeasonLabel(season)}
            </option>
          ))}
        </select>
      </div>

      <ChipGroup
        label="Category"
        options={mechanismOptions}
        selected={selectedMechanisms}
        onToggle={onToggleMechanism}
      />

      <ChipGroup
        label="CAD platform"
        options={platformOptions}
        selected={selectedPlatforms}
        onToggle={onTogglePlatform}
      />
    </div>
  );
}
