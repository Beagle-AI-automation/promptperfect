'use client';

import { useCompletion } from '@ai-sdk/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PromptInput } from '@/components/PromptInput';
import { AppModeSelector } from '@/components/AppModeSelector';
import { StreamingPromptOutput } from '@/components/StreamingPromptOutput';
import { ExplanationPanel } from '@/components/ExplanationPanel';
import { HistoryPanel, type OptimizationHistoryItem } from '@/components/HistoryPanel';
import {
  explanationTextFromFullCompletion,
  optimizedTextFromFullCompletion,
  saveToHistory,
} from '@/lib/client/optimizationHistory';
import { FeedbackButtons } from '@/components/FeedbackButtons';
import { ShareButton } from '@/components/ShareButton';
import { StatsBar } from '@/components/StatsBar';
import { AppSettingsPanel } from '@/components/AppSettingsPanel';
import type { OptimizationMode, Provider } from '@/lib/types';

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
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [runMeta, setRunMeta] = useState<{
    mode: OptimizationMode;
    provider: Provider;
    inputLength: number;
  } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statsRefresh, setStatsRefresh] = useState(0);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const optimizeContextRef = useRef({ mode: 'better' as OptimizationMode });

  const [syncCompletion, setSyncCompletion] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const id = setTimeout(() => {
      try {
        const raw = localStorage.getItem('pp_user');
        if (!raw) {
          router.replace('/login');
          return;
        }
        const u = JSON.parse(raw) as PPUser;
        setUser(u);
        setProvider((u.provider as Provider) || 'gemini');
        setApiKey(loadApiKey((u.provider as Provider) || 'gemini'));
        setHydrated(true);
      } catch {
        router.replace('/login');
      }
    }, 0);
    return () => clearTimeout(id);
  }, [mounted, router]);

  useEffect(() => {
    setApiKey(loadApiKey(provider));
  }, [provider]);

  useEffect(() => {
    optimizeContextRef.current.mode = selectedMode;
  }, [selectedMode]);

  useEffect(() => {
    const open = () => setSettingsOpen(true);
    document.addEventListener('open-settings', open);
    return () => document.removeEventListener('open-settings', open);
  }, []);

  const hasApiKey = typeof apiKey === 'string' && apiKey.trim() !== '';

  const {
    completion: streamCompletion,
    complete,
    setCompletion: setStreamCompletion,
    isLoading: streamLoading,
    error: streamError,
  } = useCompletion({
    api: '/api/optimize',
    streamProtocol: 'text',
    body: {
      mode: selectedMode,
      provider,
    },
    onFinish: async (prompt, completion) => {
      setStatsRefresh((n) => n + 1);
      setHistoryRefresh((n) => n + 1);
      const histId = await saveToHistory({
        prompt_original: prompt.trim(),
        prompt_optimized: optimizedTextFromFullCompletion(completion),
        mode: optimizeContextRef.current.mode,
        explanation: explanationTextFromFullCompletion(completion),
      });
      setHistoryId(histId);
    },
    fetch: async (input, init) => {
      const res = await fetch(input, init);
      if (!res.ok) {
        let msg = `Request failed: ${res.status}`;
        try {
          const text = await res.text();
          const data = text
            ? (JSON.parse(text) as { error?: string; message?: string })
            : {};
          if (typeof data?.error === 'string' && data.error.trim()) msg = data.error.trim();
          else if (typeof data?.message === 'string' && data.message.trim())
            msg = data.message.trim();
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
  const error = isGemini ? streamError : syncError ? new Error(syncError) : null;

  const handleOptimize = useCallback(() => {
    if (!inputText.trim()) return;
    const sid = generateSessionId();
    const trimmed = inputText.trim();
    optimizeContextRef.current.mode = selectedMode;
    setExplanation('');
    setSessionId(sid);
    setHistoryId(null); // Reset history ID for new optimization
    setRunMeta({ mode: selectedMode, provider, inputLength: trimmed.length });

    const coreBody = {
      text: trimmed,
      prompt: trimmed,
      mode: selectedMode,
      provider,
      session_id: sid,
    };

    if (isGemini) {
      void complete(trimmed, {
        body: {
          ...coreBody,
          apiKey: undefined,
        },
      });
    } else {
      setSyncError(null);
      setSyncLoading(true);
      setSyncCompletion('');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (hasApiKey) {
        headers.Authorization = `Bearer ${apiKey.trim()}`;
      }
      fetch('/api/optimize-sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...coreBody,
          ...(hasApiKey ? { apiKey: apiKey.trim() } : {}),
        }),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (data.error) throw new Error(data.error);
          return data as {
            optimizedText?: string;
            explanation?: string;
            changes?: string;
            rawText?: string;
          };
        })
        .then(async (data) => {
          const { optimizedText, explanation: expl, changes, rawText } = data;
          const raw = typeof rawText === 'string' ? rawText : '';
          const scoreMatch = raw.match(SCORE_PATTERN);
          const scorePrefix = scoreMatch ? `${scoreMatch[0]}\n` : '';
          const full =
            scorePrefix +
            (optimizedText ?? '') +
            (expl ? `\n${EXPLANATION_DELIMITER}\n${expl}` : '') +
            (changes ? `\n${CHANGES_DELIMITER}\n${changes}` : '');
          setSyncCompletion(full);
          setExplanation(expl || '');
          setStatsRefresh((n) => n + 1);
          setHistoryRefresh((n) => n + 1);
          const histId = await saveToHistory({
            prompt_original: trimmed,
            prompt_optimized: (optimizedText ?? '').trim(),
            mode: selectedMode,
            explanation: (expl ?? '').trim(),
          });
          setHistoryId(histId);
        })
        .catch((err) =>
          setSyncError(err instanceof Error ? err.message : 'Request failed'),
        )
        .finally(() => setSyncLoading(false));
    }
  }, [inputText, selectedMode, provider, apiKey, hasApiKey, isGemini, complete]);

  const [selectedHistoryItem, setSelectedHistoryItem] =
    useState<OptimizationHistoryItem | null>(null);

  const handleHistorySelect = useCallback(
    (item: OptimizationHistoryItem) => {
      setSelectedHistoryItem(item);
      setHistoryId(item.id); // Set the history ID so Share button appears
      const full =
        item.prompt_optimized +
        (item.explanation.trim()
          ? `\n${EXPLANATION_DELIMITER}\n${item.explanation.trim()}`
          : '');
      setInputText(item.prompt_original);
      setExplanation(item.explanation || '');
      if (isGemini) {
        setStreamCompletion(full);
      } else {
        setSyncCompletion(full);
      }
    },
    [isGemini, setStreamCompletion],
  );

  const handleLogout = () => {
    localStorage.removeItem('pp_user');
    router.replace('/');
  };

  if (!mounted || !hydrated || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#050505]">
        <div className="text-[#ECECEC]">Loading…</div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#050505] font-sans md:pr-72">
      <header className="fixed left-0 right-0 top-0 z-40 flex h-14 shrink-0 items-center border-b border-[#1a1a1a] bg-[#050505]/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between px-6 md:px-8">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-[#ECECEC]">PromptPerfect</span>
            <span className="text-sm text-[#666]">by Beagle</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-[#888] sm:inline">
              Hi, {user.name || user.email}
            </span>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="rounded-lg border border-transparent px-3 py-1.5 text-sm text-[#888] transition-all duration-200 ease-out hover:border-[#2a2a2a] hover:bg-[#111] hover:text-[#ECECEC]"
              aria-label="Settings"
            >
              ⚙️ Settings
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-transparent px-3 py-1.5 text-sm text-[#888] transition-all duration-200 ease-out hover:border-[#2a2a2a] hover:bg-[#111] hover:text-[#ECECEC]"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="smooth-scroll mt-14 flex min-h-0 w-full flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <div className="shrink-0 px-6 pt-5">
          <StatsBar refreshTrigger={statsRefresh} />
        </div>

        {/* Two-column textarea section: row on large screens, normal flow, no overlap */}
        <div className="flex w-full flex-col gap-5 px-6 pb-0 pt-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <PromptInput
              variant="optimizer"
              value={inputText}
              onChange={setInputText}
              disabled={isLoading}
            />
          </div>

          <div className="min-w-0 flex-1">
            <StreamingPromptOutput
              variant="optimizer"
              text={completion}
              isStreaming={isLoading}
              onExplanation={setExplanation}
              afterTextarea={
                completion && !isLoading ? (
                  <div className="flex items-center gap-3">
                    {historyId && <ShareButton historyId={historyId} />}
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
                ) : null
              }
            />
          </div>
        </div>

        {/* Mode + Optimize — below textareas, stacked */}
        <div className="shrink-0 px-6 py-5">
          <span className="mb-3 block text-[11px] font-medium uppercase tracking-[0.08em] text-[#666]">
            Mode
          </span>
          <div className="flex w-full justify-center">
            <AppModeSelector
              variant="optimizer"
              value={selectedMode}
              onChange={setSelectedMode}
              disabled={isLoading}
            />
          </div>
          <button
            type="button"
            onClick={handleOptimize}
            disabled={!inputText.trim() || isLoading}
            className="mx-auto mt-3 flex h-12 w-full max-w-[300px] cursor-pointer items-center justify-center rounded-[12px] border-none bg-[linear-gradient(135deg,#4552FF,#5c6aff)] text-[15px] font-semibold text-white transition-opacity duration-200 ease-out hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Optimizing…' : 'Optimize'}
          </button>
        </div>

        {error && (
          <p className="shrink-0 px-6 pb-2 text-center text-sm text-red-400">
            {error.message}
          </p>
        )}

        <div className="mt-2 w-full shrink-0 px-6 pb-8">
          <ExplanationPanel
            explanation={explanation}
            original={inputText}
            optimized={getOptimizedPromptText(completion)}
          />
        </div>
      </main>

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

      <aside className="fixed bottom-0 right-0 top-14 z-30 hidden h-[calc(100vh-3.5rem)] w-72 md:block">
        <HistoryPanel
          onSelect={handleHistorySelect}
          refreshTrigger={historyRefresh}
          selectedId={selectedHistoryItem?.id ?? null}
        />
      </aside>
    </div>
  );
}
