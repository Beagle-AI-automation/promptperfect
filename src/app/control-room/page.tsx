'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Provider } from '@/lib/types';
import { createSupabaseBrowserClient } from '@/lib/client/supabaseBrowser';
import { readEnginePrefs, writeEnginePrefs } from '@/lib/client/enginePrefsStorage';
import { resolveAuthUserAndSession } from '@/lib/client/ppUserSync';

const PROVIDER_MODELS: Record<Provider, string> = {
  gemini: 'gemini-2.0-flash',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-20241022',
};

const PROVIDER_LABELS: Record<Provider, string> = {
  gemini: 'Gemini 2.0 Flash',
  openai: 'OpenAI GPT-4o-mini',
  anthropic: 'Anthropic Claude Haiku',
};

const PROVIDER_DESCRIPTIONS: Record<Provider, string> = {
  gemini: 'Free. No setup needed.',
  openai: 'BYOK. Fast and reliable.',
  anthropic: 'BYOK. Best for nuanced prompts.',
};

export default function ControlRoomPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ id: string; provider: string; api_key?: string } | null>(null);
  const [provider, setProvider] = useState<Provider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'checking' | 'ok' | 'fail'>(
    'idle',
  );
  const [verifyMessage, setVerifyMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [continueError, setContinueError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    const id = setTimeout(() => {
      if (cancelled) return;
      const client = createSupabaseBrowserClient();
      if (!client) {
        router.replace('/signup');
        return;
      }
      void resolveAuthUserAndSession(client).then(({ user }) => {
        if (cancelled) return;
        if (!user?.id) {
          router.replace('/signup');
          return;
        }
        const prefs = readEnginePrefs();
        const providerPref = (prefs?.provider as Provider) || 'gemini';
        setUser({
          id: user.id,
          provider: providerPref,
          api_key: undefined,
        });
        if (providerPref && providerPref !== 'gemini') {
          router.replace('/app');
          return;
        }
        setProvider(providerPref);
        setContinueError('');
      });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [mounted, router]);

  const handleVerify = async () => {
    if (provider === 'gemini') return;
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setVerifyStatus('fail');
      setVerifyMessage('Enter an API key to verify');
      return;
    }
    setVerifyStatus('checking');
    setVerifyMessage('');
    const payload = await fetch('/api/verify-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey: trimmed }),
    })
      .then((res) => res.json())
      .catch(() => ({ ok: false as const, reason: 'Provider unreachable' }));

    const ok = payload?.ok === true;
    setVerifyStatus(ok ? 'ok' : 'fail');
    setVerifyMessage(
      ok ? 'Provider reachable' : typeof payload?.reason === 'string' ? payload.reason : 'Provider unreachable',
    );
  };

  const handleContinue = async () => {
    if (!user) return;
    setSaving(true);
    setContinueError('');
    try {
      const res = await fetch('/api/auth/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          provider,
          model: PROVIDER_MODELS[provider],
          api_key: provider !== 'gemini' ? apiKey : '',
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setContinueError(
          typeof payload.error === 'string' && payload.error.trim()
            ? payload.error
            : 'Could not save your settings',
        );
        return;
      }
      writeEnginePrefs({
        provider,
        model: PROVIDER_MODELS[provider],
      });
      if (provider !== 'gemini' && apiKey.trim() !== '') {
        try {
          const stored: Record<string, string> = JSON.parse(
            localStorage.getItem('promptperfect:apikey') || '{}',
          );
          stored[provider] = apiKey.trim();
          localStorage.setItem('promptperfect:apikey', JSON.stringify(stored));
        } catch {
          localStorage.setItem('promptperfect:apikey', JSON.stringify({ [provider]: apiKey.trim() }));
        }
      }
      router.push('/app');
    } catch {
      setContinueError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="text-[#ECECEC]">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] p-6 text-[#ECECEC] md:p-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-[#ECECEC]">Initialize Your AI Engine</h1>
        <p className="mt-2 text-zinc-400">
          PromptPerfect works out of the box with Gemini. Connect your own AI for more control.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(['gemini', 'openai', 'anthropic'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setProvider(p);
                setContinueError('');
                setVerifyStatus('idle');
                setVerifyMessage('');
              }}
              className={`rounded-xl border-2 bg-zinc-900/80 p-4 text-left transition ${
                provider === p
                  ? 'border-[#4552FF] shadow-[0_0_16px_rgba(69,82,255,0.33)]'
                  : 'border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <span className="text-xl">
                {p === 'gemini' && '🟢'}
                {p === 'openai' && '⬛'}
                {p === 'anthropic' && '🟣'}
              </span>
              <h3 className="mt-2 font-semibold text-[#ECECEC]">{PROVIDER_LABELS[p]}</h3>
              <p className="mt-1 text-sm text-zinc-400">{PROVIDER_DESCRIPTIONS[p]}</p>
            </button>
          ))}
        </div>

        {continueError && (
          <p className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {continueError}
          </p>
        )}

        {provider === 'gemini' ? (
          <div className="mt-8 rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
            <p className="animate-[fade-in_0.3s_ease-out_forwards] font-mono text-[#22c55e]">
              ✓ Gemini 2.0 Flash — Ready (no setup needed)
            </p>
            <button
              type="button"
              onClick={handleContinue}
              disabled={saving}
              className="mt-6 w-full rounded-lg bg-[#4552FF] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              Enter PromptPerfect →
            </button>
          </div>
        ) : (
          <>
            <div
              className="mt-8 rounded-[12px] border border-[#333] bg-[#0d0d0d] p-6 font-mono text-sm"
              style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
            >
              <h3 className="font-semibold text-[#ECECEC]">🔐 Connect Your AI Engine</h3>
              <div className="mt-4 space-y-3">
                <p className="text-zinc-400">
                  Provider: {provider === 'openai' ? 'OpenAI' : 'Anthropic'}
                </p>
                <div>
                  <label className="block text-zinc-400">Enter API Key:</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setVerifyStatus('idle');
                      setVerifyMessage('');
                    }}
                    placeholder="sk-..."
                    className="mt-1 w-full rounded border border-zinc-600 bg-zinc-900 px-3 py-2 text-[#ECECEC] placeholder-zinc-500 focus:border-[#4552FF] focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleVerify()}
                  disabled={verifyStatus === 'checking'}
                  className="rounded border border-zinc-600 bg-zinc-800 px-4 py-2 text-[#ECECEC] hover:bg-zinc-700 disabled:opacity-50"
                >
                  {verifyStatus === 'checking' ? 'Verifying…' : 'Verify Connection'}
                </button>
              </div>
            </div>

            {verifyStatus !== 'idle' && (
              <div className="mt-4 font-mono text-sm">
                {verifyStatus === 'checking' && (
                  <p className="text-zinc-400">Checking provider…</p>
                )}
                {verifyStatus === 'ok' && (
                  <p className="text-[#22c55e]">✓ {verifyMessage}</p>
                )}
                {verifyStatus === 'fail' && (
                  <p
                    className={
                      verifyMessage === 'Invalid key' ? 'text-amber-400' : 'text-red-400'
                    }
                  >
                    {verifyMessage === 'Invalid key' ? '✗ Invalid key' : `✗ ${verifyMessage}`}
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleContinue}
              disabled={saving}
              className="mt-6 w-full rounded-lg bg-[#4552FF] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              Enter PromptPerfect →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
