'use client';

import { ApiKeyField } from '@/components/ApiKeyField';
import { SegmentedControl } from '@/components/SegmentedControl';
import type { Mode, OptimizeVersion } from '@/lib/types';
import { useState } from 'react';

const MODE_OPTIONS: Array<{ value: Mode; label: string }> = [
  { value: 'developer', label: 'Developer' },
  { value: 'research', label: 'Research' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'product', label: 'Product' },
  { value: 'marketing', label: 'Marketing' },
];

const VERSION_OPTIONS: Array<{ value: OptimizeVersion; label: string }> = [
  { value: 'v2', label: 'Stream' },
  { value: 'v1', label: 'Sync' },
];

interface PromptPerfectFormProps {
  mode: Mode;
  onModeChange: (value: Mode) => void;
  version: OptimizeVersion;
  onVersionChange: (value: OptimizeVersion) => void;
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  apiKeyHelpText: string;
  apiKeyDisabled?: boolean;
  modelOverride: string;
  onModelOverrideChange: (value: string) => void;
  disabled?: boolean;
}

export function PromptPerfectForm(props: PromptPerfectFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-6">
      <SegmentedControl
        label="Mode"
        value={props.mode}
        onChange={props.onModeChange}
        options={MODE_OPTIONS}
        disabled={props.disabled}
      />

      <button
        type="button"
        onClick={() => setShowAdvanced((s) => !s)}
        className="inline-flex w-fit items-center gap-2 rounded-2xl border border-zinc-200 bg-white/70 px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-50 dark:hover:bg-zinc-950"
      >
        {showAdvanced ? 'Hide' : 'Show'} advanced
      </button>

      {showAdvanced ? (
        <div className="rounded-3xl border border-zinc-200 bg-white/60 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/40">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ApiKeyField
              value={props.apiKey}
              onChange={props.onApiKeyChange}
              helpText={props.apiKeyHelpText}
              disabled={props.apiKeyDisabled}
            />

            <div className="flex flex-col gap-4">
              <SegmentedControl
                label="Engine"
                value={props.version}
                onChange={props.onVersionChange}
                options={VERSION_OPTIONS}
                disabled={props.disabled}
              />

              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium tracking-wide text-zinc-600 dark:text-zinc-400">
                  Model override (optional)
                </span>
                <input
                  value={props.modelOverride}
                  onChange={(e) => props.onModelOverrideChange(e.target.value)}
                  placeholder="gemini-2.5-flash"
                  disabled={props.disabled}
                  className="h-11 w-full rounded-2xl border border-zinc-200 bg-white/70 px-3 text-sm text-zinc-900 shadow-sm outline-none backdrop-blur transition focus:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-50"
                />
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Leave empty to use the fallback list.
                </span>
              </label>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

