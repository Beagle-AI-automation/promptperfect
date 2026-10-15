'use client';

import { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';
import { SignInRequiredModal } from '@/components/SignInRequiredModal';
import { isUnlimitedMode } from '@/lib/localMode';
import { copyText } from '@/lib/clipboard';
import { getAllLocalHistory } from '@/lib/client/optimizationHistory';

interface ShareButtonProps {
  historyId: string;
  /** Pass the signed-in user's id. Omit or pass null for guests. */
  userId?: string | null;
  disabled?: boolean;
}

export function ShareButton({ historyId, userId, disabled = false }: ShareButtonProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);

  const handleShare = async () => {
    // Local mode without backend: copy the optimized text straight away.
    if ((!userId || historyId.startsWith('local-')) && isUnlimitedMode()) {
      const row = getAllLocalHistory().find((r) => r.id === historyId);
      const text = row
        ? `${row.prompt_optimized}${row.explanation.trim() ? `\n\n${row.explanation.trim()}` : ''}`
        : '';
      if (text.trim()) {
        await copyToClipboard(text);
        return;
      }
      // fall through to sign-in modal when the local row is gone
    }

    // Guest or local-only history — show sign-in modal immediately.
    if (!userId || historyId.startsWith('local-')) {
      setShowSignInModal(true);
      return;
    }

    if (shareUrl) {
      await copyToClipboard(shareUrl);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/share/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ historyId }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          setShowSignInModal(true);
          return;
        }
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
    if (await copyText(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setError('Failed to copy to clipboard');
    }
  };

  return (
    <>
      <SignInRequiredModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        title="Sign in to Share"
      />
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
    </>
  );
}
