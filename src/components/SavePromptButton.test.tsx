import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SavePromptButton } from "./SavePromptButton";

const insertFn = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ error: null })
);

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    from: () => ({
      insert: insertFn,
    }),
  }),
}));

describe("SavePromptButton", () => {
  beforeEach(() => {
    insertFn.mockClear();
    insertFn.mockResolvedValue({ error: null });
  });

  it("renders nothing without userId", () => {
    const { container } = render(
      <SavePromptButton
        originalPrompt="a"
        optimizedPrompt="b"
        explanation=""
        mode="better"
        provider="gemini"
        userId={null}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows Save to Library when userId is set", async () => {
    render(
      <SavePromptButton
        originalPrompt="orig"
        optimizedPrompt="opt"
        explanation="ex"
        mode="better"
        provider="gemini"
        userId="user-1"
      />
    );
    expect(
      await screen.findByRole("button", { name: /save to library/i })
    ).toBeInTheDocument();
  });

  it("opens title input and saves via Supabase", async () => {
    render(
      <SavePromptButton
        originalPrompt="orig"
        optimizedPrompt="opt"
        explanation="ex"
        mode="better"
        provider="gemini"
        userId="user-1"
      />
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /save to library/i })
    );
    const input = screen.getByLabelText(/prompt title/i);
    fireEvent.change(input, { target: { value: "My title" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(insertFn).toHaveBeenCalled();
    });
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        title: "My title",
        original_prompt: "orig",
        optimized_prompt: "opt",
        explanation: "ex",
        mode: "better",
        provider: "gemini",
      })
    );
  });
});
