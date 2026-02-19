'use client';

import { useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';

interface FeedbackButtonsProps {
  sessionId: string | null;
  disabled: boolean;
  onSubmitted?: () => void;
}

export function FeedbackButtons({
  sessionId,
  disabled,
  onSubmitted,
}: FeedbackButtonsProps) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendFeedback = async (rating: 'up' | 'down') => {
    if (!sessionId || submitted) return;
    setError(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, rating }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        hint?: string;
        debugUrl?: string;
      };
      if (res.ok) {
        setSubmitted(true);
        onSubmitted?.();
      } else {
        const msg = [data.error, data.hint].filter(Boolean).join(' ');
        setError(msg || 'Failed to send feedback');
      }
    } catch {
      setError('Failed to send feedback');
    }
  };

  const isDisabled = disabled || submitted;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => sendFeedback('up')}
          disabled={isDisabled}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <ThumbsUp className="h-4 w-4" />
          Helpful
        </button>
        <button
          type="button"
          onClick={() => sendFeedback('down')}
          disabled={isDisabled}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <ThumbsDown className="h-4 w-4" />
          Not helpful
        </button>
        {submitted && (
          <span className="text-sm text-green-600 dark:text-green-400">
            Thanks for your feedback!
          </span>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
