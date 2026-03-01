"use client";

import { useState, useEffect } from "react";

export interface ApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  title?: string;
}

export function ApiKeyDialog({
  open,
  onClose,
  onSave,
  title = "API key",
}: ApiKeyDialogProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!open) setValue("");
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onSave(trimmed);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-key-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2
          id="api-key-dialog-title"
          className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100"
        >
          {title}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="api-key-input"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Enter your API key
            </label>
            <input
              id="api-key-input"
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="sk-..."
              autoComplete="off"
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
