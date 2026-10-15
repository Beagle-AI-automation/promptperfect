"use client";

import type { OptimizationMode } from "@/lib/types";

export interface AppModeSelectorProps {
  value: OptimizationMode;
  onChange: (mode: OptimizationMode) => void;
  disabled?: boolean;
  variant?: "default" | "optimizer";
}

const MODES: { value: OptimizationMode; label: string }[] = [
  { value: "better", label: "Make it Better" },
  { value: "specific", label: "Make it Specific" },
  { value: "cot", label: "Add Chain-of-Thought" },
  { value: "production", label: "Production Audit" },
];

export function AppModeSelector({
  value,
  onChange,
  disabled = false,
  variant = "default",
}: AppModeSelectorProps) {
  if (variant === "optimizer") {
    return (
      <div
        className="flex w-full flex-wrap justify-center gap-2"
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
              className={`rounded-[20px] px-5 py-2 text-[13px] font-medium transition-colors duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] disabled:opacity-50 ${
                isSelected
                  ? "border-0 bg-accent text-white"
                  : "border border-solid border-[#252525] bg-[#151515] text-[#808088] hover:border-accent hover:text-[#ccc]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      <span className="mb-3 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Mode
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
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-zinc-900 ${
                isSelected
                  ? "border-accent bg-accent/10 text-accent-text dark:text-[#8B9AFF]"
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
