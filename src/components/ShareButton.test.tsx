'use client';

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ShareButton } from "./ShareButton";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const FLAG = "NEXT_PUBLIC_UNLIMITED_MODE";
const prevFlag = process.env[FLAG];
const LOCAL_KEY = "pp:optimization_history_local";

function seedLocalRow() {
  localStorage.setItem(
    LOCAL_KEY,
    JSON.stringify([
      {
        id: "local-abc",
        session_id: "s1",
        prompt_original: "orig",
        prompt_optimized: "optimized text",
        mode: "better",
        explanation: "why",
        created_at: new Date().toISOString(),
      },
    ])
  );
}

describe("ShareButton", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    delete process.env[FLAG];
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    if (prevFlag === undefined) delete process.env[FLAG];
    else process.env[FLAG] = prevFlag;
  });

  it("shows the sign-in modal for guests in product mode", async () => {
    render(<ShareButton historyId="local-abc" userId={null} />);
    fireEvent.click(screen.getByRole("button", { name: /share/i }));
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("copies local text directly in unlimited mode", async () => {
    process.env[FLAG] = "true";
    seedLocalRow();
    render(<ShareButton historyId="local-abc" userId={null} />);
    fireEvent.click(screen.getByRole("button", { name: /share/i }));
    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("optimized text")
    );
  });

  it("generates a server link for signed-in users", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ shareUrl: "https://x/s/abc" }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ShareButton historyId="550e8400-e29b-41d4-a716-446655440000" userId="u1" />);
    fireEvent.click(screen.getByRole("button", { name: /share/i }));
    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/share/generate",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("opens the sign-in modal on 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }))
    );
    render(<ShareButton historyId="550e8400-e29b-41d4-a716-446655440000" userId="u1" />);
    fireEvent.click(screen.getByRole("button", { name: /share/i }));
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
