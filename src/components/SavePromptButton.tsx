'use client';

import { useMemo, useState, useEffect } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/client/supabaseBrowser';
import { getPromptPerfectAuthHeaders } from '@/lib/client/promptPerfectAuthHeaders';
import { isUnlimitedMode } from '@/lib/localMode';
import {
  getOrCreateSessionId,
  saveToLocalLibrary,
} from '@/lib/client/optimizationHistory';

export interface SavePromptButtonProps {
  originalPrompt: string;
  optimizedPrompt: string;
  explanation: string;
  mode: string;
  provider: string;
  userId: string | null;
  /** Current `pp_optimization_history.id` when shown under the optimizer. */
  historyId?: string | null;
  /** True when this history row is already linked in the library (from server). */
  alreadySaved?: boolean;
  onSavedToLibrary?: () => void;
}

export function SavePromptButton({
  originalPrompt,
  optimizedPrompt,
  explanation,
  mode,
  provider,
  userId,
  historyId,
  alreadySaved = false,
  onSavedToLibrary,
}: SavePromptButtonProps) {
  const [justSaved, setJustSaved] = useState(false);
  const [showTitleInput, setShowTitleInput] = useState(false);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  // Local mode (no backend): guests can save snapshots into the local library.
  const localMode = !supabase && isUnlimitedMode();

  useEffect(() => {
    setJustSaved(false);
    setShowTitleInput(false);
    setTitle('');
    setError(null);
  }, [historyId]);

  useEffect(() => {
    if (alreadySaved) setJustSaved(false);
  }, [alreadySaved]);

  if (!userId && !localMode) return null;

  const showSavedState = alreadySaved || justSaved;

  const handleSave = async () => {
    if (!title.trim()) return;
    setError(null);
    if (localMode) {
      saveToLocalLibrary({
        title: title.trim(),
        prompt_original: originalPrompt,
        prompt_optimized: optimizedPrompt,
        explanation,
        mode,
        provider,
        session_id: getOrCreateSessionId(),
        history_id: historyId ?? null,
      });
      setJustSaved(true);
      setShowTitleInput(false);
      setTitle('');
      onSavedToLibrary?.();
      return;
    }
    if (!supabase) return;
    setError(null);
    setSaving(true);
    try {
      const headers = await getPromptPerfectAuthHeaders(supabase);
      if (!headers) {
        setError('Sign in again to save prompts.');
        return;
      }
      const body: Record<string, unknown> = {
        title: title.trim(),
        original_prompt: originalPrompt,
        optimized_prompt: optimizedPrompt,
        explanation,
        mode,
        provider,
      };
      if (historyId && /^[\da-f-]{36}$/i.test(historyId)) {
        body.history_id = historyId;
      }
      const res = await fetch('/api/saved-prompts', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        hint?: string;
      };
      if (!res.ok) {
        setError(
          [data.error, data.hint].filter(Boolean).join(' — ') ||
            'Could not save',
        );
        return;
      }
      setJustSaved(true);
      setShowTitleInput(false);
      setTitle('');
      onSavedToLibrary?.();
    } finally {
      setSaving(false);
    }
  };

  if (showSavedState) {
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          disabled
          className="flex items-center gap-2 text-sm font-medium text-accent-text"
        >
          <BookmarkCheck size={16} strokeWidth={1} aria-hidden />
          Saved!
        </button>
        <span role="status" aria-live="polite" className="sr-only">
          Saved to your library
        </span>
      </div>
    );
  }

  if (showTitleInput) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Name this prompt…"
            className="w-48 rounded-lg border border-[#252525] bg-[#0A0A0A] px-3 py-1.5 text-sm text-white placeholder-[#8a8a8a] focus:border-accent focus:outline-none"
            autoFocus
            disabled={saving}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSave();
            }}
          />
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !title.trim()}
            className="text-sm text-accent-text hover:underline disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowTitleInput(false);
              setTitle('');
              setError(null);
            }}
            className="text-sm text-[#8a8a8a] hover:underline"
          >
            Cancel
          </button>
        </div>
        {error ? (
          <p className="text-xs text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setShowTitleInput(true)}
        className="flex items-center gap-2 text-sm text-[#B0B0B0] transition hover:text-accent-text"
      >
        <Bookmark size={16} strokeWidth={1} aria-hidden />
        Save to Library
      </button>
      {error ? (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
