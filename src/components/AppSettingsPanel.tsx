'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Provider } from '@/lib/types';
import { writeEnginePrefs } from '@/lib/client/enginePrefsStorage';

const STORAGE_KEY = 'promptperfect:apikey';
const PROVIDER_LABELS: Record<Provider, string> = {
  gemini: 'Gemini 2.0 Flash',
  openai: 'OpenAI GPT-4o-mini',
  anthropic: 'Anthropic Claude Haiku',
};

function loadStoredKey(p: Provider): string {
  if (p === 'gemini') return '';
  try {
    const stored: Record<string, string> = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || '{}',
    );
    return stored[p] || '';
  } catch {
    // swallow: JSON.parse failed on stored key blob — return empty string
    return '';
  }
}

interface AppSettingsPanelProps {
  open: boolean;
  onClose: () => void;
  provider: Provider;
  onProviderChange: (p: Provider) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  onSaveSuccess: () => void;
}

export function AppSettingsPanel({
  open,
  onClose,
  provider,
  onProviderChange,
  apiKey,
  onApiKeyChange,
  onSaveSuccess,
}: AppSettingsPanelProps) {
  const [localProvider, setLocalProvider] = useState<Provider>(provider);
  const [localKey, setLocalKey] = useState(() => apiKey || loadStoredKey(provider));
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyState, setVerifyState] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    setLocalProvider(provider);
    setLocalKey(apiKey || loadStoredKey(provider));
    setVerifyState('idle');
    setSaveError('');
  }, [open, provider, apiKey]);

  const handleVerifyKey = async () => {
    if (localProvider === 'gemini' || !localKey.trim()) return;
    setVerifying(true);
    try {
      const res = await fetch('/api/verify-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          provider: localProvider,
          apiKey: localKey.trim(),
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean }
        | null;
      setVerifyState(res.ok && data?.ok ? 'valid' : 'invalid');
    } catch {
      setVerifyState('invalid');
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch('/api/auth/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          provider: localProvider,
          model:
            localProvider === 'gemini'
              ? 'gemini-2.0-flash'
              : localProvider === 'openai'
                ? 'gpt-6-astra'
                : 'claude-3-5-haiku-20241022',
          api_key: localProvider !== 'gemini' ? localKey : '',
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(
          typeof payload.error === 'string' && payload.error.trim()
            ? payload.error
            : 'Could not save settings',
        );
        return;
      }
      onProviderChange(localProvider);
      onApiKeyChange(localProvider !== 'gemini' ? localKey : '');
      if (localProvider !== 'gemini') {
        try {
          const stored: Record<string, string> = JSON.parse(
            localStorage.getItem(STORAGE_KEY) || '{}',
          );
          stored[localProvider] = localKey.trim();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
        } catch {
          // swallow: JSON.parse failed on existing key blob — overwrite with single-provider object
          try {
            localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify({ [localProvider]: localKey.trim() }),
            );
          } catch {
            // swallow: quota / private mode — key stays in memory for the session
          }
        }
      }
      writeEnginePrefs({
        provider: localProvider,
        model:
          localProvider === 'gemini'
            ? 'gemini-2.0-flash'
            : localProvider === 'openai'
              ? 'gpt-6-astra'
              : 'claude-3-5-haiku-20241022',
      });
      onSaveSuccess();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed right-0 top-0 z-50 h-full w-[360px] border-l border-zinc-800 bg-[#0d0d0d] shadow-xl transition-transform duration-300 ease-out"
        style={{ transform: open ? 'translateX(0)' : 'translateX(100%)' }}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <h2 className="text-lg font-semibold text-[#ECECEC]">AI Engine Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-2 text-zinc-400 hover:bg-zinc-800 hover:text-[#ECECEC]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-zinc-400">
            Current: {PROVIDER_LABELS[provider]}
          </p>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-300">Provider</span>
            <div className="grid grid-cols-3 gap-2">
              {(['gemini', 'openai', 'anthropic'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setLocalProvider(p);
                    setLocalKey(loadStoredKey(p));
                  }}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    localProvider === p
                      ? 'border-accent bg-accent/10 text-[#ECECEC]'
                      : 'border-zinc-600 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  {p === 'gemini' && '🟢'}
                  {p === 'openai' && '⬛'}
                  {p === 'anthropic' && '🟣'} {PROVIDER_LABELS[p].split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
          {localProvider !== 'gemini' && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={localKey}
                onChange={(e) => {
                  setLocalKey(e.target.value);
                  setVerifyState('idle');
                }}
                placeholder="Paste your API key"
                className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-[#ECECEC] placeholder-zinc-500 focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={handleVerifyKey}
                disabled={!localKey.trim() || verifying}
                className="mt-2 rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
              >
                {verifying ? 'Verifying…' : 'Verify'}
              </button>
              {verifyState === 'valid' && (
                <p className="mt-1 text-xs text-green-500">Key verified successfully.</p>
              )}
              {verifyState === 'invalid' && !verifying && (
                <p className="mt-1 text-xs text-red-400">Could not verify this key. Check it and try again.</p>
              )}
            </div>
          )}
          {saveError && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {saveError}
            </p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </>
  );
}
