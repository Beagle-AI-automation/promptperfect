interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<SelectOption<T>>;
  disabled?: boolean;
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  disabled,
}: SelectFieldProps<T>) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        disabled={disabled}
        className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

