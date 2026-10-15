'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useCompletion } from '@ai-sdk/react';
import type { OptimizationHistoryItem } from '@/lib/historyMerge';
import {
  explanationTextFromFullCompletion,
  getOrCreateSessionId,
  optimizedTextFromFullCompletion,
  saveToHistory,
} from '@/lib/client/optimizationHistory';
import {
  GUEST_TOKEN_LIMIT,
  getGuestId,
  setGuestCount,
  incrementGuestCount,
  decrementGuestCount,
  isGuestLimitReached,
} from '@/lib/guest';
import { useOptimisticThumbs } from '@/hooks/useOptimisticThumbs';
import { useLibraryStatus } from '@/hooks/useLibraryStatus';
import { useGuestUsageSync } from '@/hooks/useGuestUsageSync';
import { isUnlimitedMode } from '@/lib/localMode';
import type { AppUser, OptimizationMode, Provider } from '@/lib/types';
import { readStatsBarCache } from '@/lib/client/statsBarCache';
import {
  CHANGES_DELIMITER,
  EXPLANATION_DELIMITER,
} from '@/lib/delimiter';
import {
  FEEDBACK_MODES,
  modeFromHistoryRow,
} from '@/lib/modes';

export interface RunMeta {
  mode: OptimizationMode;
  provider: Provider;
  inputLength: number;
}

export interface OptimizeRunnerOptions {
  user: AppUser | null;
  provider: Provider;
  apiKey: string;
  mounted: boolean;
  hydrated: boolean;
}

export interface OptimizeRunner {
  inputText: string;
  setInputText: (v: string) => void;
  selectedMode: OptimizationMode;
  setSelectedMode: (m: OptimizationMode) => void;
  explanation: string;
  setExplanation: (v: string) => void;
  completion: string;
  isLoading: boolean;
  error: Error | null;
  sessionId: string | null;
  historyId: string | null;
  runMeta: RunMeta | null;
  inLibrary: boolean | null;
  setInLibrary: (v: boolean | null) => void;
  statsRefresh: number;
  historyRefresh: number;
  selectedHistoryItem: OptimizationHistoryItem | null;
  showLimitModal: boolean;
  setShowLimitModal: (v: boolean) => void;
  usageGateError: string | null;
  guestUsageVersion: number;
  thumbOptimistic: { up: number; down: number };
  handleOptimize: () => Promise<void>;
  resetComposerToNewPrompt: () => void;
  handleProjectDigest: (digest: string) => void;
  handleRemediate: (directiveBlock: string) => void;
  handleTranslateOutput: (translatedFullText: string) => void;
  handleHistorySelect: (item: OptimizationHistoryItem) => void;
  handleHistoryDeleted: (deletedId: string) => void;
  handleStatsThumbsSynced: (payload: { thumbsUp: number; thumbsDown: number }) => void;
  handleFeedbackSubmitted: (direction: 'up' | 'down') => void;
  /** Bump the stats bar (e.g. after settings save). */
  refreshStats: () => void;
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

interface ReoptimizeIntent {
  text: string;
  mode: OptimizationMode | null;
  autoOptimize: boolean;
}

/**
 * One-shot intent stashed by library "Re-optimize" / template fork via
 * sessionStorage. Read lazily during state init (no set-state-in-effect);
 * the key itself is removed by a mount effect below.
 */
function readReoptimizeIntent(): ReoptimizeIntent | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem('pp_reoptimize');
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as { text?: string; mode?: string; autoOptimize?: boolean };
    const text = typeof o.text === 'string' && o.text.trim() ? o.text : '';
    if (!text) return null;
    const mode =
      o.mode && (FEEDBACK_MODES as readonly string[]).includes(o.mode)
        ? (o.mode as OptimizationMode)
        : null;
    return { text, mode, autoOptimize: o.autoOptimize === true };
  } catch {
    // swallow: invalid reoptimize payload
    return null;
  }
}

/**
 * Composer + run lifecycle for the `/app` workspace: streaming/sync
 * completion, guest quota gating, history persistence, history selection,
 * re-optimize / project-digest / remediate / translate flows, and the
 * stats/history refresh cascade. Extracted from `src/app/app/page.tsx` —
 * behavior preserved verbatim.
 */
export function useOptimizeRunner({
  user,
  provider,
  apiKey,
  mounted,
  hydrated,
}: OptimizeRunnerOptions): OptimizeRunner {
  const [initialIntent] = useState(readReoptimizeIntent);
  const [inputText, setInputText] = useState(initialIntent?.text ?? '');
  const [selectedMode, setSelectedMode] = useState<OptimizationMode>(
    initialIntent?.mode ?? 'better',
  );
  const [explanation, setExplanation] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [runMeta, setRunMeta] = useState<RunMeta | null>(null);
  const [statsRefresh, setStatsRefresh] = useState(0);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [selectedHistoryItem, setSelectedHistoryItem] =
    useState<OptimizationHistoryItem | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [guestUsageVersion, setGuestUsageVersion] = useState(0);
  const [usageGateError, setUsageGateError] = useState<string | null>(null);
  const [syncCompletion, setSyncCompletion] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const optimizeContextRef = useRef({ mode: 'better' as OptimizationMode });
  const optimizeSessionIdRef = useRef<string | null>(null);
  const userRef = useRef<AppUser | null>(null);
  const selectedHistoryItemRef = useRef<OptimizationHistoryItem | null>(null);
  const historyIdRef = useRef<string | null>(null);
  const providerRef = useRef(provider);

  /** Optimistic thumbs overlay (history refreshes now, stats on a delay cascade). */
  const {
    thumbOptimistic,
    handleStatsThumbsSynced,
    handleFeedbackSubmitted,
    seedServerThumbs,
  } = useOptimisticThumbs({
    onStatsRefresh: useCallback(() => {
      setStatsRefresh((n) => n + 1);
    }, []),
    onHistoryRefresh: useCallback(() => {
      setHistoryRefresh((n) => n + 1);
    }, []),
  });

  /** Set to true when arriving from library "Re-optimize" — consumed by auto-trigger below. */
  const pendingAutoOptimizeRef = useRef(false);
  const pendingAutoRunRef = useRef(false);
  /** Always holds the latest handleOptimize to avoid stale-closure issues in the auto-trigger. */
  const handleOptimizeRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !mounted) return;
    // Consume the one-shot stash (values already applied via lazy state init).
    if (initialIntent?.autoOptimize) pendingAutoOptimizeRef.current = true;
    try {
      sessionStorage.removeItem('pp_reoptimize');
    } catch {
      // swallow: storage unavailable — a stale intent re-reads as a no-op
    }
  }, [mounted, initialIntent]);

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
      seedServerThumbs(c.thumbsUp, c.thumbsDown);
    }
  }, [user?.id, seedServerThumbs]);

  useEffect(() => {
    providerRef.current = provider;
  }, [provider]);

  // Merge the server-side guest counter once the app hydrates (guests only).
  const bumpGuestUsageVersion = useCallback(
    () => setGuestUsageVersion((v) => v + 1),
    [],
  );
  useGuestUsageSync({
    mounted,
    hydrated,
    userId: user?.id,
    onSynced: bumpGuestUsageVersion,
  });

  useEffect(() => {
    optimizeContextRef.current.mode = selectedMode;
  }, [selectedMode]);

  /** Whether this history row is already in the library (server). */
  const [inLibrary, setInLibrary] = useLibraryStatus(user?.id, historyId);

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
          // swallow: prefer upstream error message when parsing fails
        }
        throw new Error(msg);
      }
      return res;
    },
    onError: () => {
      // Refund the optimistic guest reservation: failed runs must not burn quota.
      if (!userRef.current) {
        decrementGuestCount();
        setGuestUsageVersion((v) => v + 1);
      }
    },
  });

  const isGemini = provider === 'gemini';
  const completion = isGemini ? streamCompletion : syncCompletion;
  const isLoading = isGemini ? streamLoading : syncLoading;
  const error = isGemini
    ? (streamError ?? null)
    : syncError ? new Error(syncError) : null;

  const handleOptimize = useCallback(async () => {
    if (!inputText.trim()) return;
    setUsageGateError(null);

    // Unlimited local-dev mode: no quota gate, no server tracking, no counting.
    if (!user && !isUnlimitedMode()) {
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
        // Sync local counter with server's confirmed count so the bar reflects reality.
        if (typeof body.count === 'number') {
          setGuestCount(body.count);
        } else {
          // 429 means limit is reached — ensure local state reflects that.
          setGuestCount(GUEST_TOKEN_LIMIT);
        }
        setGuestUsageVersion((v) => v + 1);
        setShowLimitModal(true);
        return;
      }

      // For any server-side failure (503 = DB not configured, 500 = upsert error, etc.)
      // fall through to optimistic local tracking so guests aren't blocked by infra issues.
      const data = res.ok
        ? ((await res.json().catch(() => ({}))) as { count?: number; persisted?: boolean })
        : {};

      // Always increment locally by at least 1; use server count only when it's higher.
      // This prevents the counter from sticking at 1 if the server DB is unavailable.
      const localNext = incrementGuestCount();
      if (typeof data.count === 'number' && data.count > localNext) {
        setGuestCount(data.count);
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
        .catch((err) => {
          // Refund the optimistic guest reservation: failed runs must not burn quota.
          if (!user) {
            decrementGuestCount();
            setGuestUsageVersion((v) => v + 1);
          }
          setSyncError(err instanceof Error ? err.message : 'Request failed');
        })
        .finally(() => setSyncLoading(false));
    }
  }, [user, inputText, selectedMode, provider, apiKey, hasApiKey, isGemini, complete]);

  // Keep ref in sync after every render so the auto-trigger always calls the
  // latest version (assigned in an effect — never during render).
  useEffect(() => {
    handleOptimizeRef.current = handleOptimize;
  });

  // Auto-trigger: fires when arriving from library "Re-optimize".
  // Waits for both hydrated AND user so the history row is saved with user_id.
  useEffect(() => {
    if (!hydrated || !user || !pendingAutoOptimizeRef.current || !inputText.trim() || isLoading) return;
    pendingAutoOptimizeRef.current = false;
    void handleOptimizeRef.current?.();
  }, [hydrated, user, inputText, isLoading]);

  // Auto-trigger: fires after "Link project directory" builds a digest.
  // Works for guests too (no user required) — mirrors the pattern above.
  useEffect(() => {
    if (!hydrated || !pendingAutoRunRef.current || !inputText.trim() || isLoading) return;
    pendingAutoRunRef.current = false;
    void handleOptimizeRef.current?.();
  }, [hydrated, inputText, isLoading]);

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
  }, [isGemini, setStreamCompletion, setInLibrary]);

  // "Link project directory" flow: load the digest as input, switch to the
  // Production Audit mode, and auto-run via pendingAutoRunRef.
  const handleProjectDigest = useCallback(
    (digest: string) => {
      resetComposerToNewPrompt();
      setInputText(digest);
      setSelectedMode('production');
      pendingAutoRunRef.current = true;
    },
    [resetComposerToNewPrompt],
  );

  // "Fix & re-run" flow: append the remediation directives to the current
  // input and auto-run. handleOptimize resets run state for the new run.
  const handleRemediate = useCallback((directiveBlock: string) => {
    if (!directiveBlock.trim()) return;
    setInputText((prev) => `${prev.trimEnd()}${directiveBlock}`);
    pendingAutoRunRef.current = true;
  }, []);

  // Output translation: swap the whole completion (markers preserved by the
  // translator) and re-derive the explanation. Treated as a fresh unsaved run.
  const handleTranslateOutput = useCallback(
    (translatedFullText: string) => {
      setSelectedHistoryItem(null);
      setHistoryId(null);
      setExplanation(explanationTextFromFullCompletion(translatedFullText));
      if (isGemini) {
        setStreamCompletion(translatedFullText);
      } else {
        setSyncCompletion(translatedFullText);
      }
    },
    [isGemini, setStreamCompletion],
  );

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
  }, [setInLibrary]);

  const refreshStats = useCallback(() => {
    setStatsRefresh((n) => n + 1);
  }, []);

  return {
    inputText,
    setInputText,
    selectedMode,
    setSelectedMode,
    explanation,
    setExplanation,
    completion,
    isLoading,
    error,
    sessionId,
    historyId,
    runMeta,
    inLibrary,
    setInLibrary,
    statsRefresh,
    historyRefresh,
    selectedHistoryItem,
    showLimitModal,
    setShowLimitModal,
    usageGateError,
    guestUsageVersion,
    thumbOptimistic,
    handleOptimize,
    resetComposerToNewPrompt,
    handleProjectDigest,
    handleRemediate,
    handleTranslateOutput,
    handleHistorySelect,
    handleHistoryDeleted,
    handleStatsThumbsSynced,
    handleFeedbackSubmitted,
    refreshStats,
  };
}
