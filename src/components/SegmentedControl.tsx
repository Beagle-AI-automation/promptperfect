interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<SegmentedOption<T>>;
  disabled?: boolean;
}

export function SegmentedControl<T extends string>({
  label,
  value,
  onChange,
  options,
  disabled,
}: SegmentedControlProps<T>) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-wide text-zinc-600 dark:text-zinc-400">
          {label}
        </span>
      </div>
      <div
        className="grid rounded-2xl border border-zinc-200 bg-white/70 p-1 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/50"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              disabled={disabled}
              className={[
                'h-10 rounded-xl px-3 text-sm font-semibold transition',
                active
                  ? 'bg-zinc-950 text-white shadow-sm dark:bg-white dark:text-zinc-950'
                  : 'text-zinc-700 hover:bg-zinc-100/80 dark:text-zinc-300 dark:hover:bg-zinc-900/60',
                disabled ? 'opacity-50 cursor-not-allowed' : '',
              ].join(' ')}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

