'use client';

import { startTransition, useState, useEffect } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import type { OptimizationMode, Provider } from '@/lib/types';
import { createSupabaseBrowserClient } from '@/lib/client/supabaseBrowser';
import { getPromptPerfectAuthHeaders } from '@/lib/client/promptPerfectAuthHeaders';

interface FeedbackButtonsProps {
  /** Per-run optimize session id (matches `optimization_logs.session_id`). */
  sessionId: string | null;
  mode: OptimizationMode;
  provider: Provider;
  inputLength: number;
  outputLength: number;
  disabled: boolean;
  /** Fired after feedback is saved; use to refresh analytics (e.g. positive/negative counts). */
  onSubmitted?: (direction: 'up' | 'down') => void;
}

export function FeedbackButtons({
  sessionId,
  mode,
  provider,
  inputLength,
  outputLength,
  disabled,
  onSubmitted,
}: FeedbackButtonsProps) {
  const [submitted, setSubmitted] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setError(null);
      setDirection(null);
      setSubmitted(false);
    });

    if (!sessionId?.trim()) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void (async () => {
      const client = createSupabaseBrowserClient();
      const authHeaders = client ? await getPromptPerfectAuthHeaders(client) : null;
      return fetch(
        `/api/feedback/status?session_id=${encodeURIComponent(sessionId.trim())}`,
        {
          headers: authHeaders ?? {},
        },
      );
    })()
      .then(async (r) => {
        const data = (await r.json()) as {
          submitted?: boolean;
          feedback?: string | null;
        };
        if (cancelled) return;
        if (data.submitted && (data.feedback === 'up' || data.feedback === 'down')) {
          setSubmitted(true);
          setDirection(data.feedback);
        }
      })
      .catch(() => {
        if (!cancelled) setSubmitted(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const sendFeedback = async (feedback: 'up' | 'down') => {
    if (!sessionId?.trim() || submitted) return;
    setError(null);
    try {
      const client = createSupabaseBrowserClient();
      const authHeaders = client ? await getPromptPerfectAuthHeaders(client) : null;
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeaders ?? {}),
        },
        body: JSON.stringify({
          mode,
          provider,
          inputLength,
          outputLength,
          feedback,
          sessionId: sessionId.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (res.ok) {
        setSubmitted(true);
        setDirection(feedback);
        onSubmitted?.(feedback);
      } else {
        setError(data.error || 'Failed to send feedback');
      }
    } catch {
      setError('Failed to send feedback');
    }
  };

  const isDisabled = disabled || submitted || loading || !sessionId?.trim();
  const upActive = submitted && direction === 'up';
  const downActive = submitted && direction === 'down';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => sendFeedback('up')}
          disabled={isDisabled}
          aria-label="Thumbs up"
          aria-pressed={upActive}
          className={`inline-flex items-center justify-center rounded-md border bg-transparent p-1 transition-colors duration-200 ease-out disabled:opacity-50 ${
            upActive
              ? 'border-[#22c55e]/40 text-[#22c55e]'
              : 'border-transparent text-[#555] hover:text-[#22c55e]'
          }`}
        >
          <ThumbsUp className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => sendFeedback('down')}
          disabled={isDisabled}
          aria-label="Thumbs down"
          aria-pressed={downActive}
          className={`inline-flex items-center justify-center rounded-md border bg-transparent p-1 transition-colors duration-200 ease-out disabled:opacity-50 ${
            downActive
              ? 'border-[#ef4444]/40 text-[#ef4444]'
              : 'border-transparent text-[#555] hover:text-[#ef4444]'
          }`}
        >
          <ThumbsDown className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
        {loading && (
          <span className="text-sm text-[#71717A]">…</span>
        )}
        {submitted && !loading && (
          <span className="text-sm text-green-500/90">Feedback saved</span>
        )}
      </div>
      {!sessionId?.trim() && !loading && (
        <p className="text-xs text-[#71717A]">
          Feedback is available for new runs. Re-optimize to register feedback on very old history.
        </p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
