"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onCopy?: () => void;
}

export function PromptInput({
  value,
  onChange,
  placeholder = "Paste or type your prompt here...",
  disabled = false,
  onCopy,
}: PromptInputProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="w-full min-w-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <label
          htmlFor="prompt-input"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Your prompt
        </label>
        <button
          type="button"
          onClick={handleCopy}
          disabled={disabled || !value.trim()}
          aria-label={copied ? "Copied" : "Copy to clipboard"}
          className="flex h-9 min-w-[44px] items-center justify-center gap-1.5 rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" aria-hidden />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <textarea
        id="prompt-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={6}
        className="min-h-[140px] w-full max-w-full resize-y rounded-xl border border-zinc-300 bg-white px-4 py-3.5 text-base text-zinc-900 placeholder-zinc-500 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400 dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20 disabled:opacity-50 box-border"
      />
    </div>
  );
}
