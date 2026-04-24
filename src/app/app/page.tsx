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
  getOrCreateSessionId,
  optimizedTextFromFullCompletion,
  saveToHistory,
} from '@/lib/client/optimizationHistory';
import { FeedbackButtons } from '@/components/FeedbackButtons';
import { ShareButton } from '@/components/ShareButton';
import { SavePromptButton } from '@/components/SavePromptButton';
import { StatsBar } from '@/components/StatsBar';
import { AppSettingsPanel } from '@/components/AppSettingsPanel';
import { DemoTokenBar } from '@/components/DemoTokenBar';
import { DemoLimitModal } from '@/components/DemoLimitModal';
import {
  getGuestId,
  getGuestCount,
  setGuestCount,
  incrementGuestCount,
  isGuestLimitReached,
} from '@/lib/guest';
import type { OptimizationMode, Provider } from '@/lib/types';
import { createSupabaseBrowserClient } from '@/lib/client/supabaseBrowser';
import { getPromptPerfectAuthHeaders } from '@/lib/client/promptPerfectAuthHeaders';
import {
  clearPromptPerfectLocalAuth,
  syncPpUserFromAuthSession,
} from '@/lib/client/ppUserSync';
import { readStatsBarCache } from '@/lib/client/statsBarCache';
import { userFacingOptimizeError } from '@/lib/optimizeUserError';
import {
  CHANGES_DELIMITER,
  EXPLANATION_DELIMITER,
  stripPromptScoreMarkers,
} from '@/lib/delimiter';
import { UserAccountMenu } from '@/components/UserAccountMenu';

const STORAGE_KEY = 'promptperfect:apikey';

function getOptimizedPromptText(fullText: string): string {
  const explIdx = fullText.indexOf(EXPLANATION_DELIMITER);
  const beforeExplanation =
    explIdx !== -1 ? fullText.slice(0, explIdx) : fullText;
  return stripPromptScoreMarkers(beforeExplanation);
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

const FEEDBACK_MODES: readonly OptimizationMode[] = [
  'better',
  'specific',
  'cot',
  'developer',
  'research',
  'beginner',
  'product',
  'marketing',
] as const;

function modeFromHistoryRow(mode: string): OptimizationMode {
  const m = mode.trim().toLowerCase();
  return (FEEDBACK_MODES as readonly string[]).includes(m)
    ? (m as OptimizationMode)
    : 'better';
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
  /** Instant bump until /api/stats finishes after feedback + delayed refresh. */
  const [thumbOptimistic, setThumbOptimistic] = useState({ up: 0, down: 0 });
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [selectedHistoryItem, setSelectedHistoryItem] =
    useState<OptimizationHistoryItem | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [guestUsageVersion, setGuestUsageVersion] = useState(0);
  const [usageGateError, setUsageGateError] = useState<string | null>(null);
  const optimizeContextRef = useRef({ mode: 'better' as OptimizationMode });
  const optimizeSessionIdRef = useRef<string | null>(null);
  const userRef = useRef<PPUser | null>(null);
  const selectedHistoryItemRef = useRef<OptimizationHistoryItem | null>(null);
  const historyIdRef = useRef<string | null>(null);
  /** Last successful /api/stats thumb counts — used to detect when server reflects new feedback. */
  const lastServerThumbsRef = useRef({ up: 0, down: 0 });
  /** Baseline thumbs at feedback submit time; optimistic clears only after server totals change. */
  const thumbFeedbackPendingRef = useRef<{
    baselineUp: number;
    baselineDown: number;
  } | null>(null);

  const [syncCompletion, setSyncCompletion] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  /** Whether this history row is already in the library (server). */
  const [inLibrary, setInLibrary] = useState<boolean | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleStatsThumbsSynced = useCallback(
    (payload: { thumbsUp: number; thumbsDown: number }) => {
      const nu = Number(payload.thumbsUp);
      const nd = Number(payload.thumbsDown);
      const up = Number.isFinite(nu) ? nu : 0;
      const down = Number.isFinite(nd) ? nd : 0;

      const pending = thumbFeedbackPendingRef.current;
      if (pending) {
        const bu = Number(pending.baselineUp);
        const bd = Number(pending.baselineDown);
        const baseUp = Number.isFinite(bu) ? bu : 0;
        const baseDown = Number.isFinite(bd) ? bd : 0;
        /** Only drop optimistic overlay once totals actually move off the pre-submit baseline. */
        const serverCaughtUp = up !== baseUp || down !== baseDown;
        if (serverCaughtUp) {
          thumbFeedbackPendingRef.current = null;
          setThumbOptimistic({ up: 0, down: 0 });
        }
      }
      lastServerThumbsRef.current = { up, down };
    },
    [],
  );

  const handleFeedbackSubmitted = useCallback((direction: 'up' | 'down') => {
    thumbFeedbackPendingRef.current = {
      baselineUp: lastServerThumbsRef.current.up,
      baselineDown: lastServerThumbsRef.current.down,
    };
    setThumbOptimistic((o) => ({
      up: o.up + (direction === 'up' ? 1 : 0),
      down: o.down + (direction === 'down' ? 1 : 0),
    }));
    const delaysMs = [450, 1100, 2600, 5200];
    for (const ms of delaysMs) {
      window.setTimeout(() => {
        setStatsRefresh((n) => n + 1);
      }, ms);
    }
    setHistoryRefresh((n) => n + 1);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !mounted) return;
    const raw = sessionStorage.getItem('pp_reoptimize');
    if (!raw) return;
    sessionStorage.removeItem('pp_reoptimize');
    try {
      const o = JSON.parse(raw) as { text?: string; mode?: string };
      if (typeof o.text === 'string') setInputText(o.text);
      if (o.mode === 'better' || o.mode === 'specific' || o.mode === 'cot') {
        setSelectedMode(o.mode);
      }
    } catch {
      // ignore invalid payload
    }
  }, [mounted]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    selectedHistoryItemRef.current = selectedHistoryItem;
  }, [selectedHistoryItem]);

  useEffect(() => {
    historyIdRef.current = historyId;
  }, [historyId]);

  /** Align feedback baseline with cached analytics when remounting /app after visiting other routes. */
  useEffect(() => {
    const uid = user?.id?.trim();
    if (!uid) return;
    const c = readStatsBarCache(uid);
    if (c) {
      lastServerThumbsRef.current = {
        up: c.thumbsUp,
        down: c.thumbsDown,
      };
    }
  }, [user?.id]);

  const providerRef = useRef(provider);
  useEffect(() => {
    providerRef.current = provider;
  }, [provider]);

  useEffect(() => {
    if (!mounted) return;
    const id = setTimeout(() => {
      try {
        const raw = localStorage.getItem('pp_user');
        if (!raw) {
          setUser(null);
          setProvider('gemini');
          setApiKey('');
          setHydrated(true);
          return;
        }
        const u = JSON.parse(raw) as PPUser;
        setUser(u);
        setProvider((u.provider as Provider) || 'gemini');
        setApiKey(loadApiKey((u.provider as Provider) || 'gemini'));
        setHydrated(true);
      } catch {
        setUser(null);
        setProvider('gemini');
        setApiKey('');
        setHydrated(true);
      }
    }, 0);
    return () => clearTimeout(id);
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !hydrated) return;
    const client = createSupabaseBrowserClient();
    if (!client) return;
    let cancelled = false;
    void syncPpUserFromAuthSession(client).then((updated) => {
      if (cancelled || !updated) return;
      try {
        const raw = localStorage.getItem('pp_user');
        if (!raw) return;
        const u = JSON.parse(raw) as PPUser;
        setUser(u);
        setProvider((u.provider as Provider) || 'gemini');
        setApiKey(loadApiKey((u.provider as Provider) || 'gemini'));
      } catch {
        // ignore
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mounted, hydrated]);

  useEffect(() => {
    if (!mounted || !hydrated || user) return;
    const gid = getGuestId();
    if (!gid) return;
    void fetch(`/api/guest-usage?guestId=${encodeURIComponent(gid)}`)
      .then((r) => r.json())
      .then(
        (data: {
          count?: number;
          serverTracking?: boolean;
        }) => {
          if (data.serverTracking === false) return;
          if (typeof data.count === 'number') {
            const merged = Math.max(getGuestCount(), data.count);
            setGuestCount(merged);
            setGuestUsageVersion((v) => v + 1);
          }
        },
      )
      .catch(() => {});
  }, [mounted, hydrated, user]);

  useEffect(() => {
    setApiKey(loadApiKey(provider));
  }, [provider]);

  useEffect(() => {
    optimizeContextRef.current.mode = selectedMode;
  }, [selectedMode]);

  useEffect(() => {
    if (!user?.id || !historyId || !/^[\da-f-]{36}$/i.test(historyId)) {
      setInLibrary(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const client = createSupabaseBrowserClient();
      if (!client) {
        if (!cancelled) setInLibrary(false);
        return;
      }
      const headers = await getPromptPerfectAuthHeaders(client);
      if (!headers) {
        if (!cancelled) setInLibrary(false);
        return;
      }
      try {
        const r = await fetch(
          `/api/saved-prompts/status?history_id=${encodeURIComponent(historyId)}`,
          { headers },
        );
        const j = (await r.json().catch(() => ({}))) as { saved?: boolean };
        if (!cancelled) setInLibrary(!!j.saved);
      } catch {
        if (!cancelled) setInLibrary(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, historyId]);

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
      const u = userRef.current;
      const authed = !!u;
      const histId = await saveToHistory({
        prompt_original: prompt.trim(),
        prompt_optimized: optimizedTextFromFullCompletion(completion),
        mode: optimizeContextRef.current.mode,
        explanation: explanationTextFromFullCompletion(completion),
        sessionId: authed ? getOrCreateSessionId() : getGuestId(),
        userId: u?.id,
        provider: providerRef.current,
        optimizeSessionId: optimizeSessionIdRef.current ?? undefined,
      });
      setHistoryId(histId);
      /** Refresh stats/history after the row exists so thumbs aggregate includes this session. */
      setStatsRefresh((n) => n + 1);
      setHistoryRefresh((n) => n + 1);
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

  const handleOptimize = useCallback(async () => {
    if (!inputText.trim()) return;
    setUsageGateError(null);

    if (!user) {
      if (isGuestLimitReached()) {
        setShowLimitModal(true);
        return;
      }

      const guestId = getGuestId();
      const res = await fetch('/api/guest-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestId,
          mode: selectedMode,
          provider,
        }),
      });

      if (res.status === 429) {
        const body = (await res.json().catch(() => ({}))) as {
          count?: number;
        };
        if (typeof body.count === 'number') {
          setGuestCount(body.count);
        }
        setGuestUsageVersion((v) => v + 1);
        setShowLimitModal(true);
        return;
      }

      if (!res.ok) {
        setUsageGateError('Could not verify guest usage. Try again.');
        return;
      }

      const data = (await res.json().catch(() => ({}))) as {
        count?: number;
        persisted?: boolean;
      };

      if (data.persisted === false) {
        incrementGuestCount();
      } else if (typeof data.count === 'number') {
        setGuestCount(data.count);
      } else {
        incrementGuestCount();
      }
      setGuestUsageVersion((v) => v + 1);
    }

    const sid = generateSessionId();
    optimizeSessionIdRef.current = sid;
    const trimmed = inputText.trim();
    optimizeContextRef.current.mode = selectedMode;
    setExplanation('');
    setSessionId(sid);
    setSelectedHistoryItem(null);
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
          const { optimizedText, explanation: expl, changes } = data;
          const full =
            (optimizedText ?? '') +
            (expl ? `\n${EXPLANATION_DELIMITER}\n${expl}` : '') +
            (changes ? `\n${CHANGES_DELIMITER}\n${changes}` : '');
          setSyncCompletion(full);
          setExplanation(expl || '');
          const histId = await saveToHistory({
            prompt_original: trimmed,
            prompt_optimized: (optimizedText ?? '').trim(),
            mode: selectedMode,
            explanation: (expl ?? '').trim(),
            sessionId: user ? getOrCreateSessionId() : getGuestId(),
            userId: user?.id,
            provider,
            optimizeSessionId: sid,
          });
          setHistoryId(histId);
          setStatsRefresh((n) => n + 1);
          setHistoryRefresh((n) => n + 1);
        })
        .catch((err) =>
          setSyncError(err instanceof Error ? err.message : 'Request failed'),
        )
        .finally(() => setSyncLoading(false));
    }
  }, [user, inputText, selectedMode, provider, apiKey, hasApiKey, isGemini, complete]);

  const resetComposerToNewPrompt = useCallback(() => {
    setSelectedHistoryItem(null);
    setHistoryId(null);
    setSessionId(null);
    setRunMeta(null);
    optimizeSessionIdRef.current = null;
    setSelectedMode('better');
    setInputText('');
    setExplanation('');
    setInLibrary(null);
    setSyncError(null);
    setSyncLoading(false);
    setUsageGateError(null);
    if (isGemini) {
      setStreamCompletion('');
    } else {
      setSyncCompletion('');
    }
  }, [isGemini, setStreamCompletion]);

  const handleHistorySelect = useCallback(
    (item: OptimizationHistoryItem) => {
      if (selectedHistoryItemRef.current?.id === item.id) {
        resetComposerToNewPrompt();
        return;
      }

      setSelectedHistoryItem(item);
      setHistoryId(item.id); // Share + Save + library status use history row id
      /** Prefer per-run optimize id for logs; legacy rows use history id so feedback works without re-running Optimize. */
      const feedbackSessionId =
        item.optimize_session_id?.trim() || item.id.trim() || null;
      setSessionId(feedbackSessionId);
      setRunMeta({
        mode: modeFromHistoryRow(item.mode),
        provider,
        inputLength: item.prompt_original.trim().length,
      });
      setSelectedMode(modeFromHistoryRow(item.mode));
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
    [isGemini, provider, resetComposerToNewPrompt, setStreamCompletion],
  );

  const handleHistoryDeleted = useCallback((deletedId: string) => {
    setHistoryRefresh((n) => n + 1);
    setStatsRefresh((n) => n + 1);
    if (selectedHistoryItemRef.current?.id === deletedId) {
      setSelectedHistoryItem(null);
      setSessionId(null);
    }
    setHistoryId((hid) => (hid === deletedId ? null : hid));
    if (historyIdRef.current === deletedId) {
      setInLibrary(false);
    }
  }, []);

  const handleLogout = async () => {
    const client = createSupabaseBrowserClient();
    await clearPromptPerfectLocalAuth(client ?? null);
    try {
      localStorage.removeItem('pp:optimization_session_id');
    } catch {
      /* ignore */
    }
    setUser(null);
    router.replace('/');
  };

  if (!mounted || !hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#050505]">
        <div className="text-[#ECECEC]">Loading…</div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex min-h-screen w-full flex-col bg-[#050505] font-sans${user ? ' md:pr-72' : ''}`}
    >
      <header className="fixed left-0 right-0 top-0 z-40 flex h-14 shrink-0 items-center border-b border-[#1a1a1a] bg-[#050505]/95 backdrop-blur-sm">
        <div className="flex w-full min-w-0 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex shrink-0 items-baseline gap-2 font-heading"
          >
            <span className="text-lg font-bold tracking-tight text-[#E7E6D9]">
              PromptPerfect
            </span>
            <span className="text-sm text-[#71717A]">by Beagle</span>
          </Link>
          <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
            {user ? (
              <>
                <Link
                  href="/library"
                  className="rounded-lg border border-transparent px-3 py-1.5 text-sm text-[#888] transition-all duration-200 ease-out hover:border-[#2a2a2a] hover:bg-[#111] hover:text-[#ECECEC]"
                >
                  Library
                </Link>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="rounded-lg border border-transparent px-3 py-1.5 text-sm text-[#888] transition-all duration-200 ease-out hover:border-[#2a2a2a] hover:bg-[#111] hover:text-[#ECECEC]"
                  aria-label="Settings"
                >
                  ⚙️ Settings
                </button>
                <UserAccountMenu
                  key={user.id}
                  userId={user.id}
                  fallbackDisplayName={
                    user.name?.trim() ||
                    user.email.split('@')[0] ||
                    user.email ||
                    'there'
                  }
                  onLogout={handleLogout}
                />
              </>
            ) : (
              <>
                <Link
                  href="/library"
                  className="rounded-lg border border-transparent px-3 py-1.5 text-sm text-[#888] transition-all duration-200 ease-out hover:border-[#2a2a2a] hover:bg-[#111] hover:text-[#ECECEC]"
                >
                  Library
                </Link>
                <Link
                  href="/login"
                  className="rounded-lg border border-transparent px-3 py-1.5 text-sm text-[#888] transition-all duration-200 ease-out hover:border-[#2a2a2a] hover:bg-[#111] hover:text-[#ECECEC]"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-[#4552FF] px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-95"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="smooth-scroll mt-14 flex min-h-0 w-full flex-1 flex-col overflow-y-auto overflow-x-hidden">
        {user && (
          <div className="shrink-0 px-6 pt-5">
            <StatsBar
              refreshTrigger={statsRefresh}
              cacheUserId={user.id}
              optimisticThumbs={thumbOptimistic}
              onStatsFetched={handleStatsThumbsSynced}
            />
          </div>
        )}

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
                  <div className="flex flex-wrap items-center gap-3">
                    {historyId && <ShareButton historyId={historyId} />}
                    <SavePromptButton
                      originalPrompt={inputText}
                      optimizedPrompt={getOptimizedPromptText(completion)}
                      explanation={explanation}
                      mode={runMeta?.mode ?? selectedMode}
                      provider={runMeta?.provider ?? provider}
                      userId={user?.id ?? null}
                      historyId={historyId}
                      alreadySaved={inLibrary === true}
                      onSavedToLibrary={() => setInLibrary(true)}
                    />
                    <FeedbackButtons
                      sessionId={sessionId}
                      mode={runMeta?.mode ?? selectedMode}
                      provider={runMeta?.provider ?? provider}
                      inputLength={runMeta?.inputLength ?? inputText.trim().length}
                      outputLength={getOptimizedPromptText(completion).length}
                      disabled={Boolean(user?.id && !historyId)}
                      onSubmitted={handleFeedbackSubmitted}
                    />
                  </div>
                ) : null
              }
            />
          </div>
        </div>

        {/* Mode + Optimize — below textareas, centered column */}
        <div className="shrink-0 px-6 py-5">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center">
            <span className="mb-3 text-center text-[11px] font-medium uppercase tracking-[0.12em] text-[#71717A]">
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
              onClick={() => void handleOptimize()}
              disabled={!inputText.trim() || isLoading}
              className="mt-4 flex h-12 w-full max-w-[300px] cursor-pointer items-center justify-center rounded-[12px] border-none bg-[linear-gradient(135deg,#4552FF,#5c6aff)] text-[15px] font-semibold text-white transition-opacity duration-200 ease-out hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Optimizing…' : 'Optimize'}
            </button>
            <DemoTokenBar
              key={guestUsageVersion}
              isAuthenticated={!!user}
            />
          </div>
        </div>

        {usageGateError && (
          <p className="shrink-0 px-6 pb-2 text-center text-sm text-red-400">
            {usageGateError}
          </p>
        )}

        {error && (
          <p className="shrink-0 px-6 pb-2 text-center text-sm text-red-400">
            {userFacingOptimizeError(error)}
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

      <DemoLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
      />

      {user && (
        <aside className="fixed bottom-0 right-0 top-14 z-30 hidden h-[calc(100vh-3.5rem)] w-72 md:block">
          <HistoryPanel
            userId={user.id}
            onSelect={handleHistorySelect}
            onDeleted={handleHistoryDeleted}
            onNewPrompt={resetComposerToNewPrompt}
            refreshTrigger={historyRefresh}
            selectedId={selectedHistoryItem?.id ?? null}
          />
        </aside>
      )}
    </div>
  );
}
