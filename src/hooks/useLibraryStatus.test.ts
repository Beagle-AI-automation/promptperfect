'use client';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLibraryStatus } from './useLibraryStatus';

const {
  mockCreateClient,
  mockGetHeaders,
  mockIsInLocalLibrary,
  mockIsUnlimitedMode,
} = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockGetHeaders: vi.fn(),
  mockIsInLocalLibrary: vi.fn(),
  mockIsUnlimitedMode: vi.fn(),
}));

vi.mock('@/lib/client/supabaseBrowser', () => ({
  createSupabaseBrowserClient: (...args: unknown[]) =>
    mockCreateClient(...args),
}));

vi.mock('@/lib/client/promptPerfectAuthHeaders', () => ({
  getPromptPerfectAuthHeaders: (...args: unknown[]) => mockGetHeaders(...args),
}));

vi.mock('@/lib/client/optimizationHistory', () => ({
  isInLocalLibrary: (...args: unknown[]) => mockIsInLocalLibrary(...args),
}));

vi.mock('@/lib/localMode', () => ({
  isUnlimitedMode: (...args: unknown[]) => mockIsUnlimitedMode(...args),
}));

const HID_A = '11111111-1111-4111-8111-111111111111';
const HID_B = '22222222-2222-4222-8222-222222222222';

describe('useLibraryStatus', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsUnlimitedMode.mockReturnValue(false);
    mockCreateClient.mockReturnValue({});
    mockGetHeaders.mockResolvedValue({ Authorization: 'Bearer x' });
    fetchMock = vi
      .fn()
      .mockResolvedValue({ json: async () => ({ saved: false }) });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null without a user or row, without fetching', () => {
    const { result } = renderHook(() => useLibraryStatus(null, HID_A));
    expect(result.current[0]).toBeNull();
    const { result: noRow } = renderHook(() =>
      useLibraryStatus('user-1', null),
    );
    expect(noRow.current[0]).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reads the local library in unlimited mode without a backend', () => {
    mockIsUnlimitedMode.mockReturnValue(true);
    mockIsInLocalLibrary.mockReturnValue(true);
    const { result } = renderHook(() => useLibraryStatus(null, 'local-1'));
    expect(mockIsInLocalLibrary).toHaveBeenCalledWith('local-1');
    expect(result.current[0]).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null for non-UUID history ids when signed in', () => {
    const { result } = renderHook(() =>
      useLibraryStatus('user-1', 'not-a-uuid'),
    );
    expect(result.current[0]).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns false without a client or auth headers', async () => {
    mockCreateClient.mockReturnValueOnce(null);
    const { result } = renderHook(() => useLibraryStatus('user-1', HID_A));
    await waitFor(() => expect(result.current[0]).toBe(false));

    mockCreateClient.mockReturnValue({});
    mockGetHeaders.mockResolvedValueOnce(null);
    const { result: noHeaders } = renderHook(() =>
      useLibraryStatus('user-1', HID_A),
    );
    await waitFor(() => expect(noHeaders.current[0]).toBe(false));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reflects the saved-prompts status API', async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => ({ saved: true }) });
    const { result } = renderHook(() => useLibraryStatus('user-1', HID_A));
    await waitFor(() => expect(result.current[0]).toBe(true));
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/saved-prompts/status?history_id=${HID_A}`,
      { headers: { Authorization: 'Bearer x' } },
    );
  });

  it('returns false when the status request fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('down'));
    const { result } = renderHook(() => useLibraryStatus('user-1', HID_A));
    await waitFor(() => expect(result.current[0]).toBe(false));
  });

  it('ignores stale responses after the row changes', async () => {
    let resolveA!: (v: { saved?: boolean }) => void;
    let resolveB!: (v: { saved?: boolean }) => void;
    const gateA = new Promise<{ saved?: boolean }>((r) => {
      resolveA = r;
    });
    const gateB = new Promise<{ saved?: boolean }>((r) => {
      resolveB = r;
    });
    fetchMock
      .mockResolvedValueOnce({ json: () => gateA })
      .mockResolvedValueOnce({ json: () => gateB });

    const { result, rerender } = renderHook(
      ({ hid }: { hid: string }) => useLibraryStatus('user-1', hid)[0],
      { initialProps: { hid: HID_A } },
    );
    rerender({ hid: HID_B });

    resolveA({ saved: true });
    await gateA;
    expect(result.current).toBeNull();

    resolveB({ saved: false });
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('exposes the setter for the optimistic just-saved update', () => {
    const { result } = renderHook(() => useLibraryStatus(null, null));
    expect(result.current[0]).toBeNull();
    act(() => {
      result.current[1](true);
    });
    expect(result.current[0]).toBe(true);
  });
});
