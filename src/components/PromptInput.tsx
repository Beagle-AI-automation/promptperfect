"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onCopy?: () => void;
  showLabel?: boolean;
  /** Optimizer workspace styling (full-height friendly) */
  variant?: "default" | "optimizer";
}

const optimizerTextarea =
  "pp-workspace-scroll box-border h-[380px] w-full shrink-0 resize-none overflow-y-auto rounded-[12px] border border-solid border-[#222] bg-[#0f0f0f] p-4 text-[14px] leading-relaxed text-[#ECECEC] placeholder-[#3a3a3a] outline-none transition-[border-color,box-shadow] duration-150 ease-out focus:border-[#4552FF] focus:shadow-[0_0_0_2px_#4552FF18] focus:outline-none disabled:opacity-50 font-[family-name:var(--font-space-grotesk),sans-serif] whitespace-pre-wrap break-words [word-break:break-word] overflow-wrap-anywhere";

export function PromptInput({
  value,
  onChange,
  placeholder = "Paste or type your prompt here...",
  disabled = false,
  onCopy,
  showLabel = true,
  variant = "default",
}: PromptInputProps) {
  const [copied, setCopied] = useState(false);

  const len = value.length;
  const tokEst = len === 0 ? 0 : Math.max(1, Math.ceil(len / 4));

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

  if (variant === "optimizer") {
    return (
      <div className="flex w-full min-w-0 flex-col">
        <div className="mb-2 flex shrink-0 items-start justify-between gap-2">
          <span className="text-sm font-medium text-[#ECECEC]">
            Your prompt
          </span>
          <button
            type="button"
            onClick={handleCopy}
            disabled={disabled || !value.trim()}
            aria-label={copied ? "Copied" : "Copy to clipboard"}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-transparent px-2 py-1 text-[12px] text-[#888] transition-all duration-200 ease-out hover:border-[#2a2a2a] hover:bg-[#111] hover:text-[#ECECEC] disabled:opacity-40"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden />
                Copy
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
          className={optimizerTextarea}
          rows={1}
        />
        <p className="mt-2 shrink-0 text-[11px] text-[#5a5a5a]">
          {len} characters -- {tokEst} tokens
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      <div
        className={`mb-3 flex items-center gap-2 ${showLabel ? "justify-between" : "justify-end"}`}
      >
        {showLabel ? (
          <label
            htmlFor="prompt-input"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Your prompt
          </label>
        ) : (
          <span className="sr-only">Your prompt</span>
        )}
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
        className="min-h-[140px] w-full max-w-full resize-y rounded-xl border border-zinc-300 bg-white px-4 py-3.5 text-base text-zinc-900 placeholder-zinc-500 whitespace-pre-wrap break-words [word-break:break-word] overflow-wrap-anywhere transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400 dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20 disabled:opacity-50 box-border"
      />
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        {len} characters · est. {tokEst} tokens
      </p>
    </div>
  );
}
