'use client';

import { cn } from '@/lib/utils';

export interface SegmentedToggleOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedToggleProps<T extends string> {
  options: readonly SegmentedToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  'aria-label'?: string;
  className?: string;
}

/**
 * Accessible segmented control (single-select). Exposes a `group` with one
 * pressable button per option, each carrying `aria-pressed`. Used for
 * mutually exclusive view switches (e.g. Explanation / Diff View).
 */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  className,
  ...rest
}: SegmentedToggleProps<T>) {
  return (
    <div
      role="group"
      className={cn('inline-flex shrink-0 rounded-md border border-border', className)}
      {...rest}
    >
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'px-3 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
              i === 0 && 'rounded-l-[5px]',
              i === options.length - 1 && 'rounded-r-[5px]',
              i > 0 && 'border-l border-border',
              active
                ? 'bg-[#1a1a1a] text-foreground'
                : 'bg-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
