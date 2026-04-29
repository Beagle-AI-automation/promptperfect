'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [verifyStep, setVerifyStep] = useState(0);
  const [verifyRunning, setVerifyRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [continueError, setContinueError] = useState('');
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

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

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const handleVerify = () => {
    if (provider === 'gemini') return;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setVerifyRunning(true);
    setVerifyStep(0);
    const t0 = setTimeout(() => setVerifyStep(1), 0);
    const t1 = setTimeout(() => setVerifyStep(2), 600);
    const t2 = setTimeout(() => setVerifyStep(3), 1200);
    const t3 = setTimeout(() => setVerifyStep(4), 1800);
    const t4 = setTimeout(() => setVerifyRunning(false), 2400);
    timersRef.current = [t0, t1, t2, t3, t4];
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
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="mt-1 w-full rounded border border-zinc-600 bg-zinc-900 px-3 py-2 text-[#ECECEC] placeholder-zinc-500 focus:border-[#4552FF] focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={verifyRunning}
                  className="rounded border border-zinc-600 bg-zinc-800 px-4 py-2 text-[#ECECEC] hover:bg-zinc-700 disabled:opacity-50"
                >
                  Verify Connection
                </button>
              </div>
            </div>

            {verifyStep > 0 && (
              <div className="mt-4 space-y-2 font-mono text-sm">
                {verifyStep >= 1 && (
                  <p className="animate-[fade-in_0.3s_ease-out_forwards] text-zinc-400">
                    Connecting to {provider === 'openai' ? 'OpenAI' : 'Anthropic'}...
                  </p>
                )}
                {verifyStep >= 2 && (
                  <p className="animate-[fade-in_0.3s_ease-out_forwards] text-[#22c55e]">
                    ✓ Provider reachable
                  </p>
                )}
                {verifyStep >= 3 && (
                  <p className="animate-[fade-in_0.3s_ease-out_forwards] text-[#22c55e]">
                    ✓ Key format valid
                  </p>
                )}
                {verifyStep >= 4 && (
                  <p className="animate-[fade-in_0.3s_ease-out_forwards] text-[#22c55e]">
                    ✓ Ready to optimize
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
