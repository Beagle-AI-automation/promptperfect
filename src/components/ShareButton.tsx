'use client';

import { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';

interface ShareButtonProps {
  historyId: string;
  disabled?: boolean;
}

export function ShareButton({ historyId, disabled = false }: ShareButtonProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShare = async () => {
    if (shareUrl) {
      // Already generated, just copy
      await copyToClipboard(shareUrl);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/share/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historyId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to generate share link' }));
        throw new Error(data.error || 'Failed to generate share link');
      }

      const data = await res.json() as { shareUrl: string };
      setShareUrl(data.shareUrl);
      await copyToClipboard(data.shareUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate share link');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Failed to copy to clipboard');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleShare}
        disabled={disabled || isGenerating}
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-green-500" />
            <span>Copied!</span>
          </>
        ) : shareUrl ? (
          <>
            <Copy className="h-4 w-4" />
            <span>Share it</span>
          </>
        ) : (
          <>
            <Share2 className="h-4 w-4" />
            <span>{isGenerating ? 'Generating...' : 'Share'}</span>
          </>
        )}
      </button>
      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
}
