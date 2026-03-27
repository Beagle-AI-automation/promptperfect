'use client';

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
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

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
    setStatus('idle');
  }, []);

  const handleSave = useCallback(async () => {
    const uid = resolvedUserId;
    if (!uid || saving) return;
    const t = title.trim();
    if (!t) return;

    const client = getSupabaseClient();
    if (!client) {
      setStatus('error');
      return;
    }

    setSaving(true);
    setStatus('idle');
    try {
      const { error } = await client.from('pp_saved_prompts').insert({
        user_id: uid,
        title: t,
        original_prompt: originalPrompt,
        optimized_prompt: optimizedPrompt,
        explanation: explanation,
        mode,
        provider,
      });
      if (error) throw error;
      setStatus('saved');
      setTimeout(() => {
        resetFlow();
      }, 1200);
    } catch {
      setStatus('error');
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

  if (!mounted || !resolvedUserId) {
    return null;
  }

  const baseBtn =
    'rounded-md border border-transparent px-2 py-0.5 text-[12px] font-medium text-[#888] transition-all duration-200 ease-out hover:border-[#2a2a2a] hover:bg-[#111] hover:text-[#ECECEC] disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <span className={`inline-flex max-w-full flex-wrap items-center gap-1.5 align-middle ${className}`}>
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setStatus('idle');
          }}
          className={baseBtn}
        >
          Save to Library
        </button>
      ) : (
        <>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSave();
              if (e.key === 'Escape') resetFlow();
            }}
            placeholder="Title"
            disabled={saving}
            autoFocus
            aria-label="Save title"
            className="min-w-[8rem] max-w-[12rem] rounded border border-[#2a2a2a] bg-[#0f0f0f] px-2 py-0.5 text-[12px] text-[#ECECEC] outline-none placeholder:text-[#555] focus:border-[#4552FF]"
          />
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !title.trim()}
            className={baseBtn}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={resetFlow} disabled={saving} className={baseBtn}>
            Cancel
          </button>
          {status === 'saved' && (
            <span className="text-[11px] text-[#22c55e]">Saved</span>
          )}
          {status === 'error' && (
            <span className="text-[11px] text-red-400">Couldn’t save</span>
          )}
        </>
      )}
    </span>
  );
}
