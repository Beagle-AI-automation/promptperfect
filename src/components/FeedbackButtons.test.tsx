'use client';

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FeedbackButtons } from "./FeedbackButtons";

vi.mock("@/lib/client/supabaseBrowser", () => ({
  createSupabaseBrowserClient: () => null,
}));

function renderButtons(sessionId: string | null = "sess-1") {
  const onSubmitted = vi.fn();
  render(
    <FeedbackButtons
      sessionId={sessionId}
      mode="better"
      provider="gemini"
      inputLength={10}
      outputLength={50}
      disabled={false}
      onSubmitted={onSubmitted}
    />
  );
  return { onSubmitted };
}

describe("FeedbackButtons", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("disables without a session and shows the hint", () => {
    renderButtons(null);
    expect(screen.getByRole("button", { name: /thumbs up/i })).toBeDisabled();
    expect(
      screen.getByText(/run optimize or choose an item/i)
    ).toBeInTheDocument();
  });

  it("submits thumbs up and confirms", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/api/feedback/status")) {
          return { ok: true, json: async () => ({ submitted: false }) };
        }
        return { ok: true, json: async () => ({}) };
      })
    );
    const { onSubmitted } = renderButtons("sess-1");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /thumbs up/i })).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole("button", { name: /thumbs up/i }));
    await waitFor(() => {
      expect(screen.getByText(/feedback saved/i)).toBeInTheDocument();
    });
    expect(onSubmitted).toHaveBeenCalledWith("up");
  });

  it("shows server errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/api/feedback/status")) {
          return { ok: true, json: async () => ({ submitted: false }) };
        }
        return { ok: false, json: async () => ({ error: "db down" }) };
      })
    );
    renderButtons("sess-1");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /thumbs up/i })).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole("button", { name: /thumbs down/i }));
    await waitFor(() => {
      expect(screen.getByText("db down")).toBeInTheDocument();
    });
  });

  it("reflects an already-submitted state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ submitted: true, feedback: "down" }),
      }))
    );
    renderButtons("sess-1");
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /thumbs down/i })
      ).toHaveAttribute("aria-pressed", "true");
    });
  });

  it("announces success via a status region", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/api/feedback/status")) {
          return { ok: true, json: async () => ({ submitted: false }) };
        }
        return { ok: true, json: async () => ({}) };
      })
    );
    renderButtons("sess-1");
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /thumbs up/i })
      ).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole("button", { name: /thumbs up/i }));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/feedback saved/i);
    });
  });

  it("announces errors via an alert region", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/api/feedback/status")) {
          return { ok: true, json: async () => ({ submitted: false }) };
        }
        return { ok: false, json: async () => ({ error: "db down" }) };
      })
    );
    renderButtons("sess-1");
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /thumbs down/i })
      ).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole("button", { name: /thumbs down/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("db down");
    });
  });
});
