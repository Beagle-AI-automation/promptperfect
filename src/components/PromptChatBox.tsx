'use client';

interface PromptChatBoxProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function PromptChatBox({ value, onChange, disabled }: PromptChatBoxProps) {
  return (
    <div className="rounded-[28px] border border-zinc-200 bg-white/50 p-5 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/30 md:p-7">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold tracking-wide text-zinc-600 dark:text-zinc-400">
          Prompt
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {value.trim() ? `${value.trim().split(/\s+/).length} words` : ' '}
        </div>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Type like you’re texting a friend. We’ll make it precise."
        rows={16}
        className="min-h-[420px] w-full resize-none rounded-3xl border border-zinc-200 bg-white/70 px-5 py-4 text-sm leading-7 text-zinc-900 shadow-sm backdrop-blur outline-none transition focus:border-zinc-400 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-50"
      />
    </div>
  );
}

