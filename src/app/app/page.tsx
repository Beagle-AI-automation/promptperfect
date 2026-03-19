'use client';

import { useCompletion } from '@ai-sdk/react';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { PromptInput } from '@/components/PromptInput';
import { AppModeSelector } from '@/components/AppModeSelector';
import { StreamingPromptOutput } from '@/components/StreamingPromptOutput';
import { ExplanationPanel } from '@/components/ExplanationPanel';
import { FeedbackButtons } from '@/components/FeedbackButtons';
import { StatsBar } from '@/components/StatsBar';
import { AppSettingsPanel } from '@/components/AppSettingsPanel';
import type { OptimizationMode, Provider } from '@/lib/types';

const GUEST_ID_KEY = 'pp_guest_id';

const STORAGE_KEY = 'promptperfect:apikey';
const EXPLANATION_DELIMITER = '---EXPLANATION---';
const CHANGES_DELIMITER = '---CHANGES---';
const SCORE_PATTERN = /---SCORE---(\d{1,3})---/;

function getOptimizedPromptText(fullText: string): string {
  const explIdx = fullText.indexOf(EXPLANATION_DELIMITER);
  const beforeExplanation = explIdx !== -1 ? fullText.slice(0, explIdx) : fullText;
  return beforeExplanation.replace(SCORE_PATTERN, '').trim();
}

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function loadApiKey(provider: Provider): string {
  if (provider === 'gemini') return '';
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return stored[provider] || '';
  } catch {
    return '';
  }
}

interface PPUser {
  id: string;
  name: string | null;
  email: string;
  provider: string;
  model: string;
}

export default function AppPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<PPUser | null>(null);
  const [inputText, setInputText] = useState('');
  const [selectedMode, setSelectedMode] = useState<OptimizationMode>('better');
  const [provider, setProvider] = useState<Provider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [explanation, setExplanation] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [runMeta, setRunMeta] = useState<{
    mode: OptimizationMode;
    provider: Provider;
    inputLength: number;
  } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statsRefresh, setStatsRefresh] = useState(0);
  const [, setGuestId] = useState<string>('');
  const [hydrated, setHydrated] = useState(false);

  // Sync response state (for BYOK)
  const [syncCompletion, setSyncCompletion] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

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
        if (raw) {
          const u = JSON.parse(raw) as PPUser;
          setUser(u);
          setProvider((u.provider as Provider) || 'gemini');
          setApiKey(loadApiKey((u.provider as Provider) || 'gemini'));
        } else {
          let gid = localStorage.getItem(GUEST_ID_KEY);
          if (!gid) {
            gid = generateSessionId();
            localStorage.setItem(GUEST_ID_KEY, gid);
          }
          setGuestId(gid);
        }
        setHydrated(true);
      } catch {
        let gid = localStorage.getItem(GUEST_ID_KEY);
        if (!gid) {
          gid = generateSessionId();
          localStorage.setItem(GUEST_ID_KEY, gid);
        }
        setGuestId(gid);
        setHydrated(true);
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [mounted, router]);

  useEffect(() => {
    setApiKey(loadApiKey(provider));
  }, [provider]);

  const saveScore = useCallback(async (sid: string, score: number) => {
    try {
      await fetch('/api/session-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sid, score }),
      });
    } catch {
      // ignore
    }
  }, []);

  // Only send apiKey when non-empty (api_key default is '' in DB)
  const hasApiKey = typeof apiKey === 'string' && apiKey.trim() !== '';

  const {
    completion: streamCompletion,
    complete,
    isLoading: streamLoading,
    error: streamError,
  } = useCompletion({
    api: '/api/optimize',
    streamProtocol: 'text',
    body: {
      mode: selectedMode,
      provider,
      apiKey: provider !== 'gemini' && hasApiKey ? apiKey : undefined,
    },
    fetch: async (input, init) => {
      const res = await fetch(input, init);
      if (!res.ok) {
        let msg = `Request failed: ${res.status}`;
        try {
          const text = await res.text();
          const data = text ? (JSON.parse(text) as { error?: string }) : {};
          if (typeof data?.error === 'string' && data.error.trim()) msg = data.error.trim();
        } catch {
          // keep default msg
        }
        throw new Error(msg);
      }
      return res;
    },
  });

  const isGemini = provider === 'gemini';
  const completion = isGemini ? streamCompletion : syncCompletion;
  const isLoading = isGemini ? streamLoading : syncLoading;
  const error = isGemini ? streamError : (syncError ? new Error(syncError) : null);

  const handleOptimize = useCallback(() => {
    if (!inputText.trim()) return;
    const sid = generateSessionId();
    const trimmed = inputText.trim();
    setExplanation('');
    setSessionId(sid);
    setRunMeta({ mode: selectedMode, provider, inputLength: trimmed.length });

    if (isGemini) {
      complete(trimmed, {
        body: {
          mode: selectedMode,
          provider,
          apiKey: undefined,
          session_id: sid,
        },
      });
    } else {
      setSyncError(null);
      setSyncLoading(true);
      setSyncCompletion('');
      fetch('/api/optimize-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: trimmed,
          mode: selectedMode,
          provider,
          ...(hasApiKey && { apiKey: apiKey.trim() }),
          session_id: sid,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          const { optimizedText, explanation: expl, changes } = data;
          const full =
            optimizedText +
            (expl ? `\n${EXPLANATION_DELIMITER}\n${expl}` : '') +
            (changes ? `\n${CHANGES_DELIMITER}\n${changes}` : '');
          setSyncCompletion(full);
          setExplanation(expl || '');
        })
        .catch((err) => setSyncError(err instanceof Error ? err.message : 'Request failed'))
        .finally(() => setSyncLoading(false));
    }
  }, [inputText, selectedMode, provider, apiKey, hasApiKey, isGemini, complete]);

  const handleLogout = () => {
    localStorage.removeItem('pp_user');
    router.replace('/');
  };

  if (!mounted || !hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="text-[#ECECEC]">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-[#050505]">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <Link href="/" className="text-xl font-bold text-zinc-900 dark:text-[#ECECEC]">
          PromptPerfect by Beagle
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Hi, {user.name || user.email}
              </span>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="cursor-pointer rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="cursor-pointer rounded-lg border border-zinc-600 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg border border-[#4552FF] px-4 py-2 text-sm font-medium text-[#4552FF] hover:bg-[#4552FF]/10"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-[#4552FF] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6">
        <div id="optimizer" className="mx-auto max-w-6xl space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <StatsBar refreshTrigger={statsRefresh} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Your prompt
              </h2>
              <PromptInput
                value={inputText}
                onChange={setInputText}
                disabled={isLoading}
              />
            </div>

            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Optimized prompt
              </h2>
              <StreamingPromptOutput
                text={completion}
                isStreaming={isLoading}
                onExplanation={setExplanation}
                onScore={
                  sessionId
                    ? (score) => saveScore(sessionId, score)
                    : undefined
                }
              />
              {completion && !isLoading && (
                <div className="flex justify-end">
                  <FeedbackButtons
                    sessionId={sessionId}
                    mode={runMeta?.mode ?? selectedMode}
                    provider={runMeta?.provider ?? provider}
                    inputLength={runMeta?.inputLength ?? inputText.trim().length}
                    outputLength={getOptimizedPromptText(completion).length}
                    disabled={false}
                    onSubmitted={() => setStatsRefresh((n) => n + 1)}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <AppModeSelector
              value={selectedMode}
              onChange={setSelectedMode}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={handleOptimize}
              disabled={!inputText.trim() || isLoading}
              className="cursor-pointer rounded-lg bg-[#4552FF] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? 'Optimizing…' : 'Optimize'}
            </button>
          </div>

          {error && (
            <p className="mt-4 text-center text-sm text-red-600 dark:text-red-400">
              {error.message}
            </p>
          )}

          <div className="mt-6 space-y-4">
            <ExplanationPanel explanation={explanation} />
          </div>
        </div>
      </main>

      {user && (
        <AppSettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          userId={user.id}
          provider={provider}
          onProviderChange={setProvider}
          apiKey={apiKey}
          onApiKeyChange={setApiKey}
          onSaveSuccess={() => setStatsRefresh((n) => n + 1)}
        />
      )}
    </div>
  );
}
