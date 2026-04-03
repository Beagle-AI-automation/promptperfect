'use client';

import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

const PP_USER_KEY = 'pp_user';

export interface SavePromptButtonProps {
  originalPrompt: string;
  optimizedPrompt: string;
  explanation: string;
  mode: string;
  provider: string;
  /**
   * When provided, used as `user_id`. When omitted, reads `pp_user` from localStorage (app auth).
   * Pass `null` to force hidden (e.g. server render without session).
   */
  userId?: string | null;
  className?: string;
}

function readUserIdFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PP_USER_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw) as { id?: string };
    return typeof u?.id === 'string' && u.id.trim() ? u.id.trim() : null;
  } catch {
    return null;
  }
}

export function SavePromptButton({
  originalPrompt,
  optimizedPrompt,
  explanation,
  mode,
  provider,
  userId: userIdProp,
  className = '',
}: SavePromptButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (userIdProp === null) {
      setResolvedUserId(null);
      return;
    }
    if (typeof userIdProp === 'string' && userIdProp.trim()) {
      setResolvedUserId(userIdProp.trim());
      return;
    }
    setResolvedUserId(readUserIdFromStorage());
  }, [mounted, userIdProp]);

  const resetFlow = useCallback(() => {
    setOpen(false);
    setTitle('');
    setError(false);
  }, []);

  const handleSave = useCallback(async () => {
    const uid = resolvedUserId;
    if (!uid || saving) return;
    const t = title.trim();
    if (!t) return;

    const client = getSupabaseClient();
    if (!client) {
      setError(true);
      return;
    }

    setSaving(true);
    setError(false);
    try {
      const { error: insertError } = await client.from('pp_saved_prompts').insert({
        user_id: uid,
        title: t,
        original_prompt: originalPrompt,
        optimized_prompt: optimizedPrompt,
        explanation: explanation,
        mode,
        provider,
      });
      if (insertError) throw insertError;
      resetFlow();
      setSavedFlash(true);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }, [
    resolvedUserId,
    saving,
    title,
    originalPrompt,
    optimizedPrompt,
    explanation,
    mode,
    provider,
    resetFlow,
  ]);

  useEffect(() => {
    if (!savedFlash) return;
    const id = window.setTimeout(() => setSavedFlash(false), 3000);
    return () => window.clearTimeout(id);
  }, [savedFlash]);

  if (!mounted || !resolvedUserId) {
    return null;
  }

  if (savedFlash) {
    return (
      <span className={`inline-flex items-center gap-2 text-sm text-green-400 ${className}`}>
        <BookmarkCheck size={16} strokeWidth={1.5} aria-hidden />
        Saved!
      </span>
    );
  }

  if (open) {
    return (
      <span className={`inline-flex flex-wrap items-center gap-2 ${className}`}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSave();
            if (e.key === 'Escape') resetFlow();
          }}
          placeholder="Name this prompt…"
          disabled={saving}
          autoFocus
          aria-label="Prompt title"
          className="w-48 max-w-[min(12rem,70vw)] rounded-lg border border-[#252525] bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none placeholder:text-[#71717A] focus:border-[#4552FF]"
        />
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !title.trim()}
          className="text-sm text-[#4552FF] hover:underline disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={resetFlow}
          disabled={saving}
          className="text-sm text-[#71717A] hover:underline"
        >
          Cancel
        </button>
        {error ? <span className="text-[11px] text-red-400">Couldn’t save</span> : null}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setOpen(true);
        setError(false);
      }}
      className={`inline-flex items-center gap-2 text-sm text-[#B0B0B0] transition hover:text-[#4552FF] ${className}`}
    >
      <Bookmark size={16} strokeWidth={1.5} aria-hidden />
      Save to Library
    </button>
  );
}
