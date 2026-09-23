export default function ChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <fieldset>
      <legend className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((option) => {
          const isActive = selected.has(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={isActive}
              onClick={() => onToggle(option)}
              className={
                "rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
                (isActive
                  ? "border-accent bg-accent text-white"
                  : "border-border-strong bg-surface text-text hover:border-accent/50 hover:text-accent")
              }
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
