'use client';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGuestUsageSync } from './useGuestUsageSync';
import { getGuestCount } from '@/lib/guest';

describe('useGuestUsageSync', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const flush = () => new Promise((r) => setTimeout(r, 0));

  beforeEach(() => {
    window.localStorage.clear();
    fetchMock = vi.fn().mockResolvedValue({ json: async () => ({ count: 0 }) });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  function setup(
    props: Partial<Parameters<typeof useGuestUsageSync>[0]> = {},
  ) {
    const onSynced = vi.fn();
    const utils = renderHook(() =>
      useGuestUsageSync({
        mounted: true,
        hydrated: true,
        userId: null,
        onSynced,
        ...props,
      }),
    );
    return { ...utils, onSynced };
  }

  it('merges the server count with the local max and notifies', async () => {
    window.localStorage.setItem('pp_guest_tokens_used', '2');
    fetchMock.mockResolvedValue({ json: async () => ({ count: 5 }) });
    const { onSynced } = setup();
    await waitFor(() => expect(onSynced).toHaveBeenCalledTimes(1));
    expect(getGuestCount()).toBe(5);
    const firstFetch = fetchMock.mock.calls[0];
    expect(firstFetch).toBeDefined();
    expect(String(firstFetch?.[0])).toContain(
      '/api/guest-usage?guestId=',
    );
  });

  it('keeps the local count when higher, still notifying', async () => {
    window.localStorage.setItem('pp_guest_tokens_used', '7');
    fetchMock.mockResolvedValue({ json: async () => ({ count: 5 }) });
    const { onSynced } = setup();
    await waitFor(() => expect(onSynced).toHaveBeenCalledTimes(1));
    expect(getGuestCount()).toBe(7);
  });

  it('skips the merge when the server is not tracking', async () => {
    window.localStorage.setItem('pp_guest_tokens_used', '2');
    fetchMock.mockResolvedValue({
      json: async () => ({ count: 9, serverTracking: false }),
    });
    const { onSynced } = setup();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await flush();
    expect(getGuestCount()).toBe(2);
    expect(onSynced).not.toHaveBeenCalled();
  });

  it('ignores non-numeric counts', async () => {
    fetchMock.mockResolvedValue({ json: async () => ({ count: 'lots' }) });
    const { onSynced } = setup();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await flush();
    expect(onSynced).not.toHaveBeenCalled();
  });

  it('does not fetch for signed-in users', () => {
    setup({ userId: 'user-1' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not fetch before mount or hydration', () => {
    setup({ mounted: false });
    setup({ hydrated: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('swallows fetch failures', async () => {
    fetchMock.mockRejectedValue(new Error('down'));
    const { onSynced } = setup();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await flush();
    expect(onSynced).not.toHaveBeenCalled();
  });
});
