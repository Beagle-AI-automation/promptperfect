import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useState } from 'react';

interface ApiKeyFieldProps {
  value: string;
  onChange: (value: string) => void;
  helpText: string;
  disabled?: boolean;
}

export function ApiKeyField({ value, onChange, helpText, disabled }: ApiKeyFieldProps) {
  const [show, setShow] = useState(false);

  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-medium tracking-wide text-zinc-600 dark:text-zinc-400">
        BYOK API key (optional)
      </span>
      <div className="relative">
        <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Paste key here"
          className="h-11 w-full rounded-2xl border border-zinc-200 bg-white/70 pl-10 pr-10 text-sm text-zinc-900 shadow-sm backdrop-blur outline-none transition focus:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-50"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-zinc-500 transition hover:bg-zinc-100/80 hover:text-zinc-700 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-300"
          tabIndex={-1}
          aria-label={show ? 'Hide key' : 'Show key'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{helpText}</span>
    </label>
  );
}

