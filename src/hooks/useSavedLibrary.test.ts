'use client';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSavedLibrary } from './useSavedLibrary';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/lib/client/supabaseBrowser', () => ({
  createSupabaseBrowserClient: () => mockBrowserClient,
}));

// Swapped per test via the mutable binding above.
let mockBrowserClient: unknown = null;

vi.mock('@/lib/client/promptPerfectAuthHeaders', () => ({
  getPromptPerfectAuthHeaders: async () => ({ Authorization: 'Bearer test' }),
}));

vi.mock('@/lib/client/ppUserSync', () => ({
  persistEnginePrefsFromAuthUser: vi.fn(),
  resolveAuthUserAndSession: async () => ({ user: { id: 'u-1' }, session: null }),
}));

function localLibraryRow(id: string, title: string, mode = 'better') {
  return {
    id,
    session_id: 's1',
    prompt_original: `original ${title}`,
    prompt_optimized: `optimized ${title}`,
    mode,
    explanation: '',
    title,
    provider: 'gemini',
    history_id: null,
    created_at: '2026-02-01T00:00:00.000Z',
  };
}

function seedLocalLibrary(rows: object[]) {
  localStorage.setItem('pp:library_saved_local', JSON.stringify(rows));
}

describe('useSavedLibrary', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    mockBrowserClient = null;
    vi.stubEnv('NEXT_PUBLIC_UNLIMITED_MODE', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('loads the local library without a backend in unlimited mode', async () => {
    vi.stubEnv('NEXT_PUBLIC_UNLIMITED_MODE', 'true');
    seedLocalLibrary([localLibraryRow('l1', 'First'), localLibraryRow('l2', 'Second')]);

    const { result } = renderHook(() => useSavedLibrary());
    await waitFor(() => expect(result.current.authReady).toBe(true));

    expect(result.current.user?.id).toBe('local');
    expect(result.current.loading).toBe(false);
    expect(result.current.rows.map((r) => r.id)).toEqual(['l1', 'l2']);
    expect(result.current.rows[0]).toMatchObject({ user_id: 'local', title: 'First' });
  });

  it('stays signed out without a backend outside unlimited mode', async () => {
    const { result } = renderHook(() => useSavedLibrary());
    await waitFor(() => expect(result.current.authReady).toBe(true));
    expect(result.current.user).toBeNull();
    expect(result.current.rows).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('filters by search query and mode, then paginates', async () => {
    vi.stubEnv('NEXT_PUBLIC_UNLIMITED_MODE', 'true');
    seedLocalLibrary([
      localLibraryRow('l1', 'Alpha plan'),
      localLibraryRow('l2', 'Beta notes', 'specific'),
      localLibraryRow('l3', 'Gamma plan', 'cot'),
    ]);

    const { result } = renderHook(() => useSavedLibrary());
    await waitFor(() => expect(result.current.authReady).toBe(true));
    expect(result.current.visibleRows).toHaveLength(3);

    act(() => {
      result.current.setSearchQuery('plan');
    });
    expect(result.current.visibleRows.map((r) => r.id)).toEqual(['l1', 'l3']);

    act(() => {
      result.current.setModeFilter('cot');
    });
    expect(result.current.visibleRows.map((r) => r.id)).toEqual(['l3']);

    // Clearing the search keeps the mode filter; pagination window resets.
    act(() => {
      result.current.setSearchQuery('');
    });
    expect(result.current.visibleRows.map((r) => r.id)).toEqual(['l3']);
  });

  it('deletes a local row optimistically', async () => {
    vi.stubEnv('NEXT_PUBLIC_UNLIMITED_MODE', 'true');
    seedLocalLibrary([localLibraryRow('l1', 'First'), localLibraryRow('l2', 'Second')]);

    const { result } = renderHook(() => useSavedLibrary());
    await waitFor(() => expect(result.current.authReady).toBe(true));

    await act(async () => {
      await result.current.confirmDelete('l1');
    });
    expect(result.current.rows.map((r) => r.id)).toEqual(['l2']);
    expect(result.current.error).toBeNull();
  });

  it('saves a template locally and reports it as saved', async () => {
    vi.stubEnv('NEXT_PUBLIC_UNLIMITED_MODE', 'true');

    const { result } = renderHook(() => useSavedLibrary());
    await waitFor(() => expect(result.current.authReady).toBe(true));
    expect(result.current.isTplSaved('some-template')).toBe(false);

    const tpl = result.current.filteredTemplates[0];
    expect(tpl).toBeDefined();
    if (!tpl) throw new Error('expected bundled templates');
    await act(async () => {
      await result.current.saveTemplate(tpl);
    });

    expect(result.current.isTplSaved(tpl.id)).toBe(true);
    expect(result.current.tplSavingId).toBeNull();
    expect(result.current.tplError).toBeNull();
  });

  it('stashes a reoptimize draft and navigates to the workspace', async () => {
    vi.stubEnv('NEXT_PUBLIC_UNLIMITED_MODE', 'true');
    seedLocalLibrary([localLibraryRow('l1', 'First')]);

    const { result } = renderHook(() => useSavedLibrary());
    await waitFor(() => expect(result.current.authReady).toBe(true));

    const row = result.current.rows[0];
    if (!row) throw new Error('expected a saved row');
    act(() => {
      result.current.reoptimize(row);
    });
    const draft = JSON.parse(
      sessionStorage.getItem('pp_reoptimize') ?? '{}',
    ) as { text?: string; autoOptimize?: boolean };
    expect(draft.text).toBe('original First');
    expect(draft.autoOptimize).toBe(true);
    expect(mockPush).toHaveBeenCalledWith('/app');
  });

  it('loads server rows for signed-in users and drops malformed ones', async () => {
    const serverRows = [
      {
        id: 's1',
        user_id: 'u-1',
        title: 'Server prompt',
        original_prompt: 'a',
        optimized_prompt: 'b',
        explanation: '',
        mode: 'better',
        provider: 'gemini',
        created_at: '2026-03-01T00:00:00.000Z',
      },
      { id: 'bad', title: 'Missing prompt fields' },
    ];
    const limit = vi.fn().mockResolvedValue({ data: serverRows, error: null });
    const orderInner = vi.fn().mockReturnValue({ limit });
    const orderOuter = vi.fn().mockReturnValue({ order: orderInner });
    const eq = vi.fn().mockReturnValue({ order: orderOuter });
    const select = vi.fn().mockReturnValue({ eq });
    mockBrowserClient = { from: vi.fn().mockReturnValue({ select }) };

    const { result } = renderHook(() => useSavedLibrary());
    await waitFor(() => expect(result.current.authReady).toBe(true));

    expect(result.current.user?.id).toBe('u-1');
    // Malformed row (missing prompt fields) is filtered by the type guard.
    expect(result.current.rows.map((r) => r.id)).toEqual(['s1']);
    expect(result.current.loading).toBe(false);
  });
});
