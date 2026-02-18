'use client';

import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useState } from 'react';

interface FeedbackButtonsProps {
  sessionId: string;
  mode: string;
  disabled: boolean;
}

export function FeedbackButtons({ sessionId, mode, disabled }: FeedbackButtonsProps) {
  const [submitted, setSubmitted] = useState(false);

  const handleClick = async (rating: 'up' | 'down') => {
    if (submitted || disabled) return;

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          rating,
          mode,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'Request failed');
      }

      setSubmitted(true);
    } catch (err) {
      console.error('[FeedbackButtons]', err);
    }
  };

  const isDisabled = disabled || submitted;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleClick('up')}
          disabled={isDisabled}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          aria-label="Thumbs up"
        >
          <ThumbsUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => handleClick('down')}
          disabled={isDisabled}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          aria-label="Thumbs down"
        >
          <ThumbsDown className="h-4 w-4" />
        </button>
      </div>
      {submitted && (
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Thanks!
        </span>
      )}
    </div>
  );
}
