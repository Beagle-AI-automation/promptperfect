'use client';

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOptimisticThumbs } from "./useOptimisticThumbs";

describe("useOptimisticThumbs", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  function setup() {
    const onStatsRefresh = vi.fn();
    const onHistoryRefresh = vi.fn();
    const utils = renderHook(() =>
      useOptimisticThumbs({ onStatsRefresh, onHistoryRefresh })
    );
    return { ...utils, onStatsRefresh, onHistoryRefresh };
  }

  it("bumps overlay, refreshes history now and stats later", () => {
    const { result, onStatsRefresh, onHistoryRefresh } = setup();

    act(() => {
      result.current.handleFeedbackSubmitted("up");
    });
    expect(result.current.thumbOptimistic).toEqual({ up: 1, down: 0 });
    expect(onHistoryRefresh).toHaveBeenCalledTimes(1);
    expect(onStatsRefresh).not.toHaveBeenCalled();

    act(() => {
      vi.runAllTimers();
    });
    expect(onStatsRefresh).toHaveBeenCalledTimes(4);
    vi.useRealTimers();
  });

  it("clears overlay only once server totals move off baseline", () => {
    const { result } = setup();

    act(() => {
      result.current.handleStatsThumbsSynced({ thumbsUp: 5, thumbsDown: 1 });
      result.current.handleFeedbackSubmitted("up");
    });
    expect(result.current.thumbOptimistic).toEqual({ up: 1, down: 0 });

    // Same totals as baseline → overlay stays.
    act(() => {
      result.current.handleStatsThumbsSynced({ thumbsUp: 5, thumbsDown: 1 });
    });
    expect(result.current.thumbOptimistic).toEqual({ up: 1, down: 0 });

    // Server caught up → overlay clears.
    act(() => {
      result.current.handleStatsThumbsSynced({ thumbsUp: 6, thumbsDown: 1 });
    });
    expect(result.current.thumbOptimistic).toEqual({ up: 0, down: 0 });
    vi.useRealTimers();
  });

  it("sanitizes non-finite server counts", () => {
    const { result } = setup();
    act(() => {
      result.current.handleStatsThumbsSynced({ thumbsUp: NaN, thumbsDown: 2 });
      result.current.handleFeedbackSubmitted("down");
      result.current.handleStatsThumbsSynced({ thumbsUp: 0, thumbsDown: 3 });
    });
    expect(result.current.thumbOptimistic).toEqual({ up: 0, down: 0 });
    vi.useRealTimers();
  });

  it("seedServerThumbs sets the baseline for the next submit", () => {
    const { result } = setup();
    act(() => {
      result.current.seedServerThumbs(10, 2);
      result.current.handleFeedbackSubmitted("up");
      // Totals equal to the seeded baseline → overlay stays.
      result.current.handleStatsThumbsSynced({ thumbsUp: 10, thumbsDown: 2 });
    });
    expect(result.current.thumbOptimistic).toEqual({ up: 1, down: 0 });
    act(() => {
      result.current.handleStatsThumbsSynced({ thumbsUp: 11, thumbsDown: 2 });
    });
    expect(result.current.thumbOptimistic).toEqual({ up: 0, down: 0 });
    vi.useRealTimers();
  });
});
