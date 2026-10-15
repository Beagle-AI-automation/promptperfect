import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GUEST_TOKEN_LIMIT,
  getGuestId,
  getStoredGuestId,
  getGuestCount,
  getGuestLimit,
  setGuestCount,
  incrementGuestCount,
  decrementGuestCount,
  isValidGuestId,
  assertGuestId,
  clearGuestSession,
  clearGuestLocalStorage,
  isGuestLimitReached,
} from "./guest";

function mockStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (k) => store[k] ?? null,
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
    expect(isGuestLimitReached(GUEST_TOKEN_LIMIT - 1, GUEST_TOKEN_LIMIT)).toBe(false);
    expect(isGuestLimitReached(GUEST_TOKEN_LIMIT, GUEST_TOKEN_LIMIT)).toBe(true);
    expect(isGuestLimitReached(GUEST_TOKEN_LIMIT + 1, GUEST_TOKEN_LIMIT)).toBe(true);
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

  it("decrementGuestCount refunds and floors at 0", () => {
    setGuestCount(5, storage);
    expect(decrementGuestCount(1, storage)).toBe(4);
    expect(getGuestCount(storage)).toBe(4);
    expect(decrementGuestCount(10, storage)).toBe(0);
    expect(getGuestCount(storage)).toBe(0);
  });

  it("isValidGuestId accepts UUIDs and legacy guest ids only", () => {
    expect(isValidGuestId("4513effe-76d7-4c98-9787-cc78e444e9b7")).toBe(true);
    expect(isValidGuestId("guest-1234567890-abcdef")).toBe(true);
    expect(isValidGuestId("abc")).toBe(false);
    expect(isValidGuestId("x".repeat(81))).toBe(false);
    expect(isValidGuestId("guest:evil;drop")).toBe(false);
    expect(isValidGuestId("")).toBe(false);
    expect(isValidGuestId(null)).toBe(false);
    expect(isValidGuestId(42)).toBe(false);
  });

  it("assertGuestId trims and rejects malformed ids", () => {
    expect(assertGuestId("  abc123  ")).toBe("abc123");
    expect(assertGuestId("  ")).toBeNull();
    expect(assertGuestId(undefined)).toBeNull();
    expect(assertGuestId("no spaces allowed!")).toBeNull();
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

describe("guest quota edge cases", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = mockStorage();
  });

  it("getGuestCount migrates the legacy count key", () => {
    storage.setItem("pp_guest_count", "4");
    expect(getGuestCount(storage)).toBe(4);
    expect(storage.getItem("pp_guest_tokens_used")).toBe("4");
  });

  it("getGuestCount treats invalid stored values as 0", () => {
    storage.setItem("pp_guest_tokens_used", "not-a-number");
    expect(getGuestCount(storage)).toBe(0);
    storage.setItem("pp_guest_tokens_used", "-3");
    expect(getGuestCount(storage)).toBe(0);
  });

  it("setGuestCount floors negatives and fractions", () => {
    setGuestCount(-2, storage);
    expect(getGuestCount(storage)).toBe(0);
    setGuestCount(3.9, storage);
    expect(getGuestCount(storage)).toBe(3);
  });

  it("increment/decrement default to 1 and ignore negative deltas", () => {
    setGuestCount(2, storage);
    expect(incrementGuestCount(undefined, storage)).toBe(3);
    expect(incrementGuestCount(-5, storage)).toBe(3);
    expect(decrementGuestCount(undefined, storage)).toBe(2);
    expect(decrementGuestCount(-5, storage)).toBe(2);
  });

  it("getStoredGuestId reads without creating", () => {
    window.localStorage.removeItem("pp_guest_id");
    expect(getStoredGuestId()).toBe("");
    window.localStorage.setItem("pp_guest_id", "  stored-id-1  ");
    expect(getStoredGuestId()).toBe("stored-id-1");
    window.localStorage.removeItem("pp_guest_id");
  });

  it("isGuestLimitReached reads the stored count by default", () => {
    window.localStorage.setItem(
      "pp_guest_tokens_used",
      String(GUEST_TOKEN_LIMIT),
    );
    expect(isGuestLimitReached()).toBe(true);
    window.localStorage.removeItem("pp_guest_tokens_used");
    expect(isGuestLimitReached()).toBe(false);
  });

  it("isGuestLimitReached is disabled in unlimited mode", () => {
    process.env.NEXT_PUBLIC_UNLIMITED_MODE = "true";
    try {
      window.localStorage.setItem("pp_guest_tokens_used", "9999");
      expect(isGuestLimitReached()).toBe(false);
      expect(isGuestLimitReached(9999)).toBe(false);
    } finally {
      delete process.env.NEXT_PUBLIC_UNLIMITED_MODE;
      window.localStorage.removeItem("pp_guest_tokens_used");
    }
  });

  it("clearGuestLocalStorage delegates to clearGuestSession", () => {
    getGuestId(storage);
    setGuestCount(2, storage);
    clearGuestLocalStorage(storage);
    expect(storage.getItem("pp_guest_id")).toBeNull();
    expect(getGuestCount(storage)).toBe(0);
  });

  it("getGuestId falls back to a random id without randomUUID", () => {
    vi.stubGlobal("crypto", {});
    try {
      expect(getGuestId(storage)).toMatch(/^guest-\d+-[0-9a-f]+$/);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("honors NEXT_PUBLIC_GUEST_TOKEN_LIMIT at load", async () => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_GUEST_TOKEN_LIMIT = "50";
    try {
      const reloaded = await import("./guest");
      expect(reloaded.GUEST_TOKEN_LIMIT).toBe(50);
    } finally {
      delete process.env.NEXT_PUBLIC_GUEST_TOKEN_LIMIT;
      vi.resetModules();
    }
  });

  it("ignores invalid NEXT_PUBLIC_GUEST_TOKEN_LIMIT values", async () => {
    for (const raw of ["bogus", "-3", "0"]) {
      vi.resetModules();
      process.env.NEXT_PUBLIC_GUEST_TOKEN_LIMIT = raw;
      try {
        const reloaded = await import("./guest");
        expect(reloaded.GUEST_TOKEN_LIMIT).toBe(5);
      } finally {
        delete process.env.NEXT_PUBLIC_GUEST_TOKEN_LIMIT;
      }
    }
    vi.resetModules();
  });
});
