interface TextareaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: TextareaFieldProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-medium tracking-wide text-zinc-600 dark:text-zinc-400">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={7}
        className="min-h-[200px] w-full resize-y rounded-3xl border border-zinc-200 bg-white/70 px-5 py-4 text-sm leading-7 text-zinc-900 shadow-sm backdrop-blur outline-none transition focus:border-zinc-400 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-50"
      />
    </label>
  );
}

