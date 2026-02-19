'use client';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function PromptInput({ value, onChange, disabled }: PromptInputProps) {
  const charCount = value.length;
  const tokenCount = Math.ceil(charCount / 4);

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Paste or type your prompt here..."
        className="h-[400px] w-full resize-none overflow-auto rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      />
      <div className="flex justify-end gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <span>{charCount} characters</span>
        <span>~{tokenCount} tokens</span>
      </div>
    </div>
  );
}
