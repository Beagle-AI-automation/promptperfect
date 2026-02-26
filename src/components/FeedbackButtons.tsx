'use client';

import { useState, useEffect } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import type { OptimizationMode, Provider } from '@/lib/types';

interface FeedbackButtonsProps {
  sessionId: string | null;
  mode: OptimizationMode;
  provider: Provider;
  inputLength: number;
  outputLength: number;
  disabled: boolean;
  onSubmitted?: () => void;
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
  const [error, setError] = useState<string | null>(null);

<<<<<<< HEAD
  const sendFeedback = async (feedback: 'up' | 'down') => {
=======
  useEffect(() => {
    setSubmitted(false);
    setError(null);
  }, [sessionId]);

  const sendFeedback = async (rating: 'up' | 'down') => {
>>>>>>> f09c6ebb8b21f827d0ae7b0d641f4037c0af75ac
    if (!sessionId || submitted) return;
    setError(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          provider,
          inputLength,
          outputLength,
          feedback,
          sessionId,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (res.ok) {
        setSubmitted(true);
        onSubmitted?.();
      } else {
        setError(data.error || 'Failed to send feedback');
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
          aria-label="Thumbs up"
          className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white p-2 text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <ThumbsUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => sendFeedback('down')}
          disabled={isDisabled}
          aria-label="Thumbs down"
          className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white p-2 text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <ThumbsDown className="h-4 w-4" />
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
