import { describe, it, expect, beforeEach } from "vitest";
import {
  GUEST_TOKEN_LIMIT,
  getGuestId,
  getGuestCount,
  getGuestLimit,
  setGuestCount,
  incrementGuestCount,
  clearGuestSession,
  isGuestLimitReached,
} from "./guest";

function mockStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = v;
    },
    removeItem: (k) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
    key: (i) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

describe("guest utilities", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = mockStorage();
  });

  it("getGuestId creates and reuses an id", () => {
    const a = getGuestId(storage);
    expect(a.length).toBeGreaterThan(0);
    expect(getGuestId(storage)).toBe(a);
  });

  it("getGuestCount returns 0 by default", () => {
    expect(getGuestCount(storage)).toBe(0);
  });

  it("setGuestCount and getGuestCount round-trip", () => {
    setGuestCount(12, storage);
    expect(getGuestCount(storage)).toBe(12);
  });

  it("isGuestLimitReached respects limit", () => {
    expect(isGuestLimitReached(49, GUEST_TOKEN_LIMIT)).toBe(false);
    expect(isGuestLimitReached(50, GUEST_TOKEN_LIMIT)).toBe(true);
    expect(isGuestLimitReached(51, GUEST_TOKEN_LIMIT)).toBe(true);
  });

  it("getGuestLimit matches constant", () => {
    expect(getGuestLimit()).toBe(GUEST_TOKEN_LIMIT);
  });

  it("incrementGuestCount bumps stored count", () => {
    setGuestCount(5, storage);
    expect(incrementGuestCount(2, storage)).toBe(7);
    expect(getGuestCount(storage)).toBe(7);
    expect(incrementGuestCount(1, storage)).toBe(8);
  });

  it("clearGuestSession removes id and token count", () => {
    getGuestId(storage);
    setGuestCount(3, storage);
    clearGuestSession(storage);
    expect(storage.getItem("pp_guest_id")).toBeNull();
    expect(storage.getItem("pp_guest_tokens_used")).toBeNull();
    expect(getGuestCount(storage)).toBe(0);
  });
});
