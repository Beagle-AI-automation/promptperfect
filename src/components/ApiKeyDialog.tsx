'use client';

import { useState } from 'react';
import type { Provider } from '@/lib/types';

const STORAGE_KEY = 'promptperfect:apikey';

function loadStoredKey(p: Provider): string {
  if (p === 'gemini') return '';
  try {
    const stored: Record<string, string> = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || '{}',
    );
    return stored[p] || '';
  } catch {
    return '';
  }
}

interface ApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
  provider: Provider;
  onProviderChange: (p: Provider) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export function ApiKeyDialog({
  open,
  onClose,
  provider,
  onProviderChange,
  apiKey,
  onApiKeyChange,
}: ApiKeyDialogProps) {
  const [localKey, setLocalKey] = useState(() => apiKey || loadStoredKey(provider));

  if (!open) return null;

  const handleSave = () => {
    onApiKeyChange(localKey);
    if (provider !== 'gemini') {
      try {
        const stored: Record<string, string> = JSON.parse(
          localStorage.getItem(STORAGE_KEY) || '{}',
        );
        stored[provider] = localKey.trim();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      } catch {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ [provider]: localKey.trim() }),
        );
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          API keys
        </h2>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Gemini is free (powered by Beagle). Or bring your own key.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Provider
          </label>
          <select
            value={provider}
            onChange={(e) => {
              const p = e.target.value as Provider;
              onProviderChange(p);
              setLocalKey(loadStoredKey(p));
            }}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="gemini">Gemini (default)</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
          </select>

          {provider !== 'gemini' && (
            <>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                API key
              </label>
              <input
                type="password"
                value={localKey}
                onChange={(e) => setLocalKey(e.target.value)}
                placeholder="Paste your API key"
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-600 dark:text-zinc-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
