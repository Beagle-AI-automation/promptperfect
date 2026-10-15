'use client';

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HistoryPanel } from "./HistoryPanel";
import { useOptimizationHistory } from "@/hooks/useOptimizationHistory";

vi.mock("@/hooks/useOptimizationHistory", () => ({
  useOptimizationHistory: vi.fn(),
}));

const mockedHook = vi.mocked(useOptimizationHistory);

function row(id: string, prompt = `prompt ${id}`) {
  return {
    id,
    session_id: "s1",
    prompt_original: prompt,
    prompt_optimized: `opt ${id}`,
    mode: "better",
    explanation: "",
    created_at: "2026-01-02T10:00:00.000Z",
  };
}

function hookState(overrides: Partial<ReturnType<typeof useOptimizationHistory>> = {}) {
  return {
    rows: [],
    loading: false,
    deletingId: null as string | null,
    deleteError: null as string | null,
    reload: vi.fn(),
    removeItem: vi.fn(async () => true),
    dismissError: vi.fn(),
    ...overrides,
  };
}

describe("HistoryPanel", () => {
  beforeEach(() => {
    mockedHook.mockReturnValue(hookState());
  });

  it("shows loading and empty states", () => {
    mockedHook.mockReturnValue(hookState({ loading: true }));
    const { rerender } = render(
      <HistoryPanel onSelect={() => {}} userId="u1" />
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    mockedHook.mockReturnValue(hookState({ loading: false, rows: [] }));
    rerender(<HistoryPanel onSelect={() => {}} userId="u1" />);
    expect(screen.getByText(/no history yet/i)).toBeInTheDocument();
  });

  it("selects rows and fires new-prompt", () => {
    const onSelect = vi.fn();
    const onNewPrompt = vi.fn();
    mockedHook.mockReturnValue(
      hookState({ rows: [row("a"), row("b")] })
    );
    render(
      <HistoryPanel
        onSelect={onSelect}
        onNewPrompt={onNewPrompt}
        userId="u1"
        selectedId="a"
      />
    );
    fireEvent.click(screen.getByText("prompt b"));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "b" })
    );
    fireEvent.click(screen.getByRole("button", { name: /new prompt/i }));
    expect(onNewPrompt).toHaveBeenCalled();
  });

  it("deletes non-library rows for signed-in users only", async () => {
    const removeItem = vi.fn(async () => true);
    mockedHook.mockReturnValue(
      hookState({ rows: [row("a"), row("lib-9")], removeItem })
    );
    render(<HistoryPanel onSelect={() => {}} userId="u1" />);
    // One delete button (lib- rows are not deletable).
    const deletes = screen.getAllByRole("button", {
      name: /delete from history/i,
    });
    expect(deletes).toHaveLength(1);
    const del = deletes[0];
    if (!del) throw new Error('expected one delete button');
    fireEvent.click(del);
    await vi.waitFor(() => {
      expect(removeItem).toHaveBeenCalledWith("a");
    });
  });

  it("shows delete errors with dismiss", () => {
    const dismissError = vi.fn();
    mockedHook.mockReturnValue(
      hookState({ deleteError: "boom", dismissError })
    );
    render(<HistoryPanel onSelect={() => {}} userId="u1" />);
    expect(screen.getByText("boom")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(dismissError).toHaveBeenCalled();
  });
});
