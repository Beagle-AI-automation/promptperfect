import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'abcdefghijkl'),
}));

import {
  clearGuestLocalStorage,
  getGuestCount,
  getGuestId,
  getGuestLimit,
  GUEST_LIMIT,
  incrementGuestCount,
  isGuestLimitReached,
  setGuestCount,
} from './guest';

describe('guest utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('getGuestId creates and persists a stable id', () => {
    const a = getGuestId();
    const b = getGuestId();
    expect(a).toBe('guest_abcdefghijkl');
    expect(b).toBe(a);
    expect(localStorage.getItem('pp_guest_id')).toBe(a);
  });

  it('getGuestCount returns 0 by default', () => {
    expect(getGuestCount()).toBe(0);
  });

  it('setGuestCount and incrementGuestCount update storage', () => {
    setGuestCount(3);
    expect(getGuestCount()).toBe(3);
    expect(incrementGuestCount()).toBe(4);
    expect(getGuestCount()).toBe(4);
  });

  it('isGuestLimitReached when count meets GUEST_LIMIT', () => {
    expect(isGuestLimitReached()).toBe(false);
    setGuestCount(GUEST_LIMIT);
    expect(isGuestLimitReached()).toBe(true);
    expect(getGuestLimit()).toBe(GUEST_LIMIT);
  });

  it('clearGuestLocalStorage removes fingerprint and count', () => {
    getGuestId();
    setGuestCount(2);
    clearGuestLocalStorage();
    expect(localStorage.getItem('pp_guest_id')).toBeNull();
    expect(localStorage.getItem('pp_guest_count')).toBeNull();
  });
});
