'use client';

import type { OptimizationMode } from '@/lib/types';
import { AppModeSelector } from '@/components/AppModeSelector';
import { DemoTokenBar } from '@/components/DemoTokenBar';
import { ProjectLinker } from '@/components/ProjectLinker';

export interface OptimizeControlsProps {
  selectedMode: OptimizationMode;
  onModeChange: (m: OptimizationMode) => void;
  disabled: boolean;
  canOptimize: boolean;
  isLoading: boolean;
  onOptimize: () => void;
  onDigest: (digest: string) => void;
  guestUsageVersion: number;
  isAuthenticated: boolean;
}

/**
 * Mode selector + Optimize button + project linker + guest quota bar below
 * the workspace textareas. Extracted from `src/app/app/page.tsx` — markup
 * preserved verbatim.
 */
export function OptimizeControls({
  selectedMode,
  onModeChange,
  disabled,
  canOptimize,
  isLoading,
  onOptimize,
  onDigest,
  guestUsageVersion,
  isAuthenticated,
}: OptimizeControlsProps) {
  return (
    <div className="shrink-0 px-6 py-5">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center">
        <span className="mb-3 text-center text-[11px] font-medium uppercase tracking-[0.12em] text-[#8a8a8a]">
          Mode
        </span>
        <div className="flex w-full justify-center">
          <AppModeSelector
            variant="optimizer"
            value={selectedMode}
            onChange={onModeChange}
            disabled={disabled}
          />
        </div>
        <button
          type="button"
          onClick={onOptimize}
          disabled={!canOptimize || disabled}
          className="mt-4 flex h-12 w-full max-w-[300px] cursor-pointer items-center justify-center rounded-[12px] border-none cta-gradient text-[15px] font-semibold text-white transition-opacity duration-200 ease-out hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Optimizing…' : 'Optimize'}
        </button>
        <div className="mt-3">
          <ProjectLinker
            onDigest={onDigest}
            disabled={disabled}
          />
        </div>
        <DemoTokenBar
          key={guestUsageVersion}
          isAuthenticated={isAuthenticated}
        />
      </div>
    </div>
  );
}
