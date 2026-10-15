'use client';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOptimizeRunner } from './useOptimizeRunner';
import type { AppUser } from '@/lib/types';

vi.mock('@ai-sdk/react', () => ({
  useCompletion: (opts: {
    onFinish?: (prompt: string, completion: string) => void;
    onError?: (err: Error) => void;
  }) => {
    completionCapture.opts = opts;
    return {
      completion: completionCapture.completion,
      complete: completionCapture.complete,
      setCompletion: completionCapture.setCompletion,
      isLoading: false,
      error: null,
    };
  },
}));

const completionCapture: {
  opts: {
    onFinish?: (prompt: string, completion: string) => void;
    onError?: (err: Error) => void;
  };
  completion: string;
  complete: ReturnType<typeof vi.fn>;
  setCompletion: ReturnType<typeof vi.fn>;
} = {
  opts: {},
  completion: '',
  complete: vi.fn(),
  setCompletion: vi.fn(),
};

vi.mock('@/lib/client/optimizationHistory', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/client/optimizationHistory')>();
  return {
    ...mod,
    getOrCreateSessionId: () => 'sess-browser',
    saveToHistory: (params: unknown) => mockSaveToHistory(params),
  };
});

const savedPayloads: unknown[] = [];
const mockSaveToHistory = vi.fn(async (params: unknown) => {
  savedPayloads.push(params);
  return 'local-test-id';
});

vi.mock('@/hooks/useLibraryStatus', () => ({
  useLibraryStatus: () => [null, vi.fn()],
}));

vi.mock('@/hooks/useGuestUsageSync', () => ({
  useGuestUsageSync: () => {},
}));

function guestFetch(handler: (url: string, init?: RequestInit) => unknown) {
  return vi.fn(async (url: unknown, init?: RequestInit) => handler(String(url), init));
}

const GUEST = null;

function setup(provider: 'gemini' | 'openai' = 'gemini', apiKey = '') {
  return renderHook(() =>
    useOptimizeRunner({
      user: GUEST,
      provider,
      apiKey,
      mounted: true,
      hydrated: true,
    }),
  );
}

describe('useOptimizeRunner', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    savedPayloads.length = 0;
    completionCapture.opts = {};
    completionCapture.completion = '';
    mockSaveToHistory.mockResolvedValue('local-test-id');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('blocks guests at the token limit with the limit modal', async () => {
    localStorage.setItem('pp_guest_tokens_used', '5');
    const fetchMock = guestFetch(() => {
      throw new Error('must not call network when gated');
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = setup();
    act(() => {
      result.current.setInputText('over the limit run');
    });
    await act(async () => {
      await result.current.handleOptimize();
    });
    expect(result.current.showLimitModal).toBe(true);
    expect(completionCapture.complete).not.toHaveBeenCalled();
  });

  it('does nothing for blank input', async () => {
    vi.stubGlobal('fetch', guestFetch(() => ({})));
    const { result } = setup();
    await act(async () => {
      await result.current.handleOptimize();
    });
    expect(result.current.showLimitModal).toBe(false);
    expect(completionCapture.complete).not.toHaveBeenCalled();
  });

  it('reserves guest quota then streams via the gemini path and saves history', async () => {
    localStorage.setItem('pp_guest_tokens_used', '1');
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      guestFetch((url) => {
        calls.push(url);
        return {
          ok: true,
          status: 200,
          json: async () => ({ count: 2, persisted: true }),
        };
      }),
    );

    const { result } = setup();
    act(() => {
      result.current.setInputText('  make it better  ');
    });
    await act(async () => {
      await result.current.handleOptimize();
    });

    expect(calls).toContain('/api/guest-usage');
    expect(completionCapture.complete).toHaveBeenCalledTimes(1);
    expect(result.current.sessionId).toBeTruthy();
    expect(result.current.runMeta).toMatchObject({
      mode: 'better',
      provider: 'gemini',
      inputLength: 14,
    });

    // Simulate the stream finishing.
    await act(async () => {
      await completionCapture.opts.onFinish?.('make it better', 'improved text');
    });
    expect(mockSaveToHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt_original: 'make it better',
        prompt_optimized: 'improved text',
        userId: undefined,
      }),
    );
    expect(result.current.historyId).toBe('local-test-id');
  });

  it('uses the sync endpoint for non-gemini providers with BYOK headers', async () => {
    localStorage.setItem('pp_guest_tokens_used', '0');
    const seen: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal(
      'fetch',
      guestFetch((url, init) => {
        seen.push({ url, init });
        if (url === '/api/guest-usage') {
          return { ok: true, status: 200, json: async () => ({ count: 1 }) };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            optimizedText: 'synced output',
            explanation: 'because',
            changes: '- a\n+ b',
          }),
        };
      }),
    );

    const { result } = setup('openai', 'sk-test');
    act(() => {
      result.current.setInputText('draft');
    });
    await act(async () => {
      await result.current.handleOptimize();
    });
    await waitFor(() =>
      expect(mockSaveToHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt_original: 'draft',
          prompt_optimized: 'synced output',
          provider: 'openai',
        }),
      ),
    );
    const syncCall = seen.find((c) => c.url === '/api/optimize-sync');
    expect(syncCall).toBeDefined();
    const headers = syncCall?.init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer sk-test');
    const body = JSON.parse(String(syncCall?.init?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({ apiKey: 'sk-test', provider: 'openai' });
  });

  it('syncs the local counter and opens the modal on guest 429', async () => {
    localStorage.setItem('pp_guest_tokens_used', '2');
    vi.stubGlobal(
      'fetch',
      guestFetch(() => ({
        ok: false,
        status: 429,
        json: async () => ({ count: 5 }),
      })),
    );
    const { result } = setup();
    act(() => {
      result.current.setInputText('hello');
    });
    await act(async () => {
      await result.current.handleOptimize();
    });
    expect(result.current.showLimitModal).toBe(true);
    expect(localStorage.getItem('pp_guest_tokens_used')).toBe('5');
    expect(completionCapture.complete).not.toHaveBeenCalled();
  });

  it('loads a history item into the composer and toggles back on re-select', () => {
    vi.stubGlobal('fetch', guestFetch(() => ({})));
    const { result } = setup();
    const item = {
      id: 'h1',
      session_id: 's1',
      prompt_original: 'orig',
      prompt_optimized: 'opt',
      mode: 'specific',
      explanation: 'why',
      created_at: new Date().toISOString(),
      optimize_session_id: 'run-9',
    };
    act(() => {
      result.current.handleHistorySelect(item);
    });
    expect(result.current.historyId).toBe('h1');
    expect(result.current.sessionId).toBe('run-9');
    expect(result.current.inputText).toBe('orig');
    expect(result.current.selectedMode).toBe('specific');
    expect(result.current.runMeta?.inputLength).toBe(4);

    act(() => {
      result.current.handleHistorySelect(item);
    });
    expect(result.current.historyId).toBeNull();
    expect(result.current.inputText).toBe('');
  });

  it('applies the sessionStorage reoptimize intent on init', () => {
    sessionStorage.setItem(
      'pp_reoptimize',
      JSON.stringify({ text: 'from library', mode: 'cot', autoOptimize: true }),
    );
    vi.stubGlobal('fetch', guestFetch(() => ({})));
    const { result } = setup();
    expect(result.current.inputText).toBe('from library');
    expect(result.current.selectedMode).toBe('cot');
    expect(sessionStorage.getItem('pp_reoptimize')).toBeNull();
  });

  it('remediate appends directives and translate swaps the output', () => {
    vi.stubGlobal('fetch', guestFetch(() => ({})));
    const { result } = setup();
    act(() => {
      result.current.setInputText('base');
    });
    act(() => {
      result.current.handleRemediate('\n- fix this');
    });
    expect(result.current.inputText).toBe('base\n- fix this');

    act(() => {
      result.current.handleTranslateOutput('texto traducido');
    });
    expect(result.current.historyId).toBeNull();
    expect(result.current.explanation).toBe('');
  });

  it('resetComposerToNewPrompt clears run state', () => {
    vi.stubGlobal('fetch', guestFetch(() => ({})));
    const { result } = setup();
    act(() => {
      result.current.setInputText('something');
      result.current.resetComposerToNewPrompt();
    });
    expect(result.current.inputText).toBe('');
    expect(result.current.selectedMode).toBe('better');
    expect(result.current.sessionId).toBeNull();
    expect(result.current.runMeta).toBeNull();
  });

  it('passes the signed-in user through to history saves', async () => {
    const user: AppUser = {
      id: 'u-1',
      name: 'U',
      email: 'u@x.com',
      provider: 'gemini',
      model: 'gemini-2.0-flash',
    };
    vi.stubGlobal('fetch', guestFetch(() => ({})));
    const { result } = renderHook(() =>
      useOptimizeRunner({ user, provider: 'gemini', apiKey: '', mounted: true, hydrated: true }),
    );
    act(() => {
      result.current.setInputText('hi');
    });
    await act(async () => {
      await result.current.handleOptimize();
    });
    await act(async () => {
      await completionCapture.opts.onFinish?.('hi', 'hi!');
    });
    expect(mockSaveToHistory).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u-1', sessionId: 'sess-browser' }),
    );
  });

  it('handleProjectDigest resets the composer and arms an auto-run', () => {
    // Arming the auto-run schedules a real optimize pass, which calls the
    // guest-usage endpoint. Stub it or the relative URL never resolves in
    // jsdom and the run rejects unhandled.
    vi.stubGlobal('fetch', guestFetch(() => ({ ok: true, status: 200, json: async () => ({ count: 1 }) })));

    const { result } = setup();

    // Leave some run state behind so we can prove the reset happened.
    act(() => {
      result.current.setInputText('draft prompt');
      result.current.handleHistorySelect({
        id: 'h1',
        session_id: 's1',
        prompt_original: 'orig',
        prompt_optimized: 'opt',
        mode: 'specific',
        explanation: 'why',
        created_at: new Date().toISOString(),
        optimize_session_id: 'run-1',
      });
    });

    const digest = 'PROJECT DIGEST\n- package.json\n- src/';
    act(() => {
      result.current.handleProjectDigest(digest);
    });

    // The digest replaces the input wholesale, not appends.
    expect(result.current.inputText).toBe(digest);
    // Production mode is the only mode that consumes a digest.
    expect(result.current.selectedMode).toBe('production');
    // Prior selection is cleared so the run is not attributed to old history.
    expect(result.current.selectedHistoryItem).toBeNull();
    expect(result.current.sessionId).toBeNull();
  });

  it('handleHistoryDeleted refreshes both lists and clears a matching selection', () => {
    const { result } = setup();

    act(() => {
      result.current.handleHistorySelect({
        id: 'h-del',
        session_id: 's-del',
        prompt_original: 'orig',
        prompt_optimized: 'opt',
        mode: 'better',
        explanation: 'why',
        created_at: new Date().toISOString(),
        optimize_session_id: 'run-del',
      });
    });
    const statsBefore = result.current.statsRefresh;
    const historyBefore = result.current.historyRefresh;
    expect(result.current.sessionId).toBe('run-del');

    act(() => {
      result.current.handleHistoryDeleted('h-del');
    });

    // Both panels poll again, otherwise a deleted row lingers in the UI.
    expect(result.current.historyRefresh).toBe(historyBefore + 1);
    expect(result.current.statsRefresh).toBe(statsBefore + 1);
    // The deleted item was the selected one, so selection and its run id go.
    expect(result.current.selectedHistoryItem).toBeNull();
    expect(result.current.sessionId).toBeNull();
  });

  it('handleHistoryDeleted keeps the selection when another row is deleted', () => {
    const { result } = setup();

    act(() => {
      result.current.handleHistorySelect({
        id: 'h-keep',
        session_id: 's-keep',
        prompt_original: 'orig',
        prompt_optimized: 'opt',
        mode: 'better',
        explanation: 'why',
        created_at: new Date().toISOString(),
        optimize_session_id: 'run-keep',
      });
    });

    act(() => {
      result.current.handleHistoryDeleted('some-other-id');
    });

    // Deleting an unrelated row must not drop what the user is looking at.
    expect(result.current.selectedHistoryItem?.id).toBe('h-keep');
    expect(result.current.sessionId).toBe('run-keep');
    expect(result.current.historyRefresh).toBeGreaterThan(0);
  });
});
