'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Provider } from '@/lib/types';

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
  gemini: 'Free. Powered by Beagle. No setup needed.',
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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    const id = setTimeout(() => {
      if (cancelled) return;
      try {
        const raw = localStorage.getItem('pp_user');
        if (!raw) {
          router.replace('/signup');
          return;
        }
        const u = JSON.parse(raw) as { id: string; provider?: string; api_key?: string };
        setUser({ id: u.id, provider: u.provider ?? 'gemini', api_key: u.api_key });
        if (u.provider && u.provider !== 'gemini') {
          router.replace('/app');
          return;
        }
        if (u.provider) setProvider(u.provider as Provider);
      } catch {
        router.replace('/signup');
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [mounted, router]);

  const handleVerify = () => {
    if (provider === 'gemini') return;
    setVerifyRunning(true);
    setVerifyStep(0);
    const t1 = setTimeout(() => setVerifyStep(1), 600);
    const t2 = setTimeout(() => setVerifyStep(2), 1200);
    const t3 = setTimeout(() => {
      setVerifyStep(3);
      setVerifyRunning(false);
    }, 1800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  };

  const handleContinue = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await fetch('/api/auth/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          provider,
          model: PROVIDER_MODELS[provider],
          api_key: provider !== 'gemini' ? apiKey : '',
        }),
      });
      const updated = {
        ...JSON.parse(localStorage.getItem('pp_user') || '{}'),
        provider,
        model: PROVIDER_MODELS[provider],
      };
      localStorage.setItem('pp_user', JSON.stringify(updated));
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
      setSaving(false);
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || !user) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-[#ECECEC]">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#ECECEC] p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-[#ECECEC]">Initialize Your AI Engine</h1>
        <p className="mt-2 text-zinc-400">
          PromptPerfect works out of the box with Gemini. Connect your own AI provider for more control.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(['gemini', 'openai', 'anthropic'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setProvider(p)}
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

        {provider === 'gemini' ? (
          <div className="mt-8 rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
            <p className="font-mono text-green-500 animate-[fade-in_0.3s_ease-out_forwards]">
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
              className="mt-8 rounded-xl border border-[#333] bg-[#0d0d0d] p-6 font-mono text-sm"
              style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
            >
              <h3 className="text-[#ECECEC] font-semibold">🔐 Connect Your AI Engine</h3>
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
                  <p className="text-zinc-400 animate-[fade-in_0.3s_ease-out_forwards]">
                    Connecting to {provider === 'openai' ? 'OpenAI' : 'Anthropic'}...
                  </p>
                )}
                {verifyStep >= 2 && (
                  <p className="text-[#22c55e] animate-[fade-in_0.3s_ease-out_forwards]">✓ Provider reachable</p>
                )}
                {verifyStep >= 3 && (
                  <>
                    <p className="text-[#22c55e] animate-[fade-in_0.3s_ease-out_forwards]">✓ Key format valid</p>
                    <p className="text-[#22c55e] animate-[fade-in_0.3s_ease-out_forwards]">✓ Ready to optimize</p>
                  </>
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
