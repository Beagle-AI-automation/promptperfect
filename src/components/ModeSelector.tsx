'use client';

import type { OptimizationMode } from '@/lib/types';

interface ModeSelectorProps {
  value: OptimizationMode;
  onChange: (mode: OptimizationMode) => void;
  disabled?: boolean;
}

const MODES: { value: OptimizationMode; label: string }[] = [
  { value: 'better', label: 'Make it Better' },
  { value: 'specific', label: 'Make it Specific' },
  { value: 'cot', label: 'Add Chain-of-Thought' },
];

export function ModeSelector({ value, onChange, disabled }: ModeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {MODES.map((m) => {
        const active = m.value === value;
        return (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(m.value)}
            disabled={disabled}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              active
                ? 'bg-blue-600 text-white'
                : 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
            } disabled:opacity-50 dark:disabled:cursor-not-allowed`}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
