"use client";

import type { OptimizationMode } from "@/lib/types";

export interface AppModeSelectorProps {
  value: OptimizationMode;
  onChange: (mode: OptimizationMode) => void;
  disabled?: boolean;
}

const MODES: { value: OptimizationMode; label: string }[] = [
  { value: "better", label: "Better" },
  { value: "specific", label: "Specific" },
  { value: "cot", label: "Chain-of-thought" },
  { value: "developer", label: "Developer" },
  { value: "research", label: "Research" },
  { value: "beginner", label: "Beginner" },
  { value: "product", label: "Product" },
  { value: "marketing", label: "Marketing" },
];

export function AppModeSelector({
  value,
  onChange,
  disabled = false,
}: AppModeSelectorProps) {
  return (
    <div className="w-full min-w-0">
      <span className="mb-3 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Optimize for
      </span>
      <div
        className="flex min-w-0 flex-wrap justify-center gap-2"
        role="group"
        aria-label="Optimization mode"
      >
        {MODES.map(({ value: v, label }) => {
          const isSelected = value === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              disabled={disabled}
              aria-pressed={isSelected}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#4552FF] focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-zinc-900 ${
                isSelected
                  ? "border-[#4552FF] bg-[#4552FF]/10 text-[#4552FF] dark:text-[#8B9AFF]"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
