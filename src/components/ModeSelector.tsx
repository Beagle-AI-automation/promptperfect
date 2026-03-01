"use client";

export type OptimizeMode = "better" | "shorter" | "longer";

export interface ModeSelectorProps {
  selected: OptimizeMode;
  onSelect: (mode: OptimizeMode) => void;
  disabled?: boolean;
}

const MODES: { value: OptimizeMode; label: string }[] = [
  { value: "better", label: "Better" },
  { value: "shorter", label: "Shorter" },
  { value: "longer", label: "Longer" },
];

export function ModeSelector({
  selected,
  onSelect,
  disabled = false,
}: ModeSelectorProps) {
  return (
    <div className="w-full min-w-0">
      <span className="mb-3 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Optimize for
      </span>
      <div
        className="flex min-w-0 flex-wrap gap-3"
        role="group"
        aria-label="Optimization mode"
      >
        {MODES.map(({ value, label }) => {
          const isSelected = selected === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelect(value)}
              disabled={disabled}
              aria-pressed={isSelected}
              className={`flex min-h-[44px] min-w-0 flex-1 basis-0 items-center justify-center rounded-xl border px-4 py-3 text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 disabled:opacity-50 sm:min-w-[44px] sm:flex-initial sm:basis-auto sm:px-5 ${
                isSelected
                  ? "border-zinc-500 bg-zinc-100 text-zinc-900 shadow-sm dark:border-zinc-400 dark:bg-zinc-800 dark:text-zinc-100"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 active:scale-[0.98] dark:border-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
