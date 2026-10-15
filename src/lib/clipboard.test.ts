import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { copyText, useCopy } from "./clipboard";

describe("copyText", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses navigator.clipboard when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await expect(copyText("hello")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("returns false for empty text", async () => {
    await expect(copyText("")).resolves.toBe(false);
  });

  it("returns false when clipboard rejects and legacy copy fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    // jsdom has no execCommand — define it as failing.
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue(false),
    });
    await expect(copyText("hello")).resolves.toBe(false);
  });

  it("falls back to execCommand when the async API is missing", async () => {
    vi.stubGlobal("navigator", {});
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue(true),
    });
    await expect(copyText("hello")).resolves.toBe(true);
  });

  it("returns false when the legacy path throws", async () => {
    vi.stubGlobal("navigator", {});
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation(() => {
        throw new Error("no exec");
      }),
    });
    await expect(copyText("hello")).resolves.toBe(false);
  });
});

describe("useCopy", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.useFakeTimers();
  });

  it("flips copied true then back after timeout", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { result } = renderHook(() => useCopy(1000));

    expect(result.current.copied).toBe(false);
    let ok = false;
    await act(async () => {
      ok = await result.current.copy("hi");
    });
    expect(ok).toBe(true);
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.copied).toBe(false);
    vi.useRealTimers();
  });
});
