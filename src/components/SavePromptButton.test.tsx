import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SavePromptButton } from "./SavePromptButton";

const fetchMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({}),
  }),
);

vi.mock("@/lib/client/supabaseBrowser", () => ({
  createSupabaseBrowserClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/client/promptPerfectAuthHeaders", () => ({
  getPromptPerfectAuthHeaders: vi.fn(() =>
    Promise.resolve({
      "Content-Type": "application/json",
      Authorization: "Bearer test-token",
    }),
  ),
}));

describe("SavePromptButton", () => {
  beforeEach(() => {
    fetchMock.mockClear();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);
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
      />,
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
      />,
    );
    expect(
      await screen.findByRole("button", { name: /save to library/i }),
    ).toBeInTheDocument();
  });

  it("opens title input and saves via /api/saved-prompts", async () => {
    render(
      <SavePromptButton
        originalPrompt="orig"
        optimizedPrompt="opt"
        explanation="ex"
        mode="better"
        provider="gemini"
        userId="user-1"
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /save to library/i }),
    );
    const input = screen.getByPlaceholderText(/name this prompt/i);
    fireEvent.change(input, { target: { value: "My title" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/saved-prompts",
      expect.objectContaining({
        method: "POST",
      }),
    );

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      title: "My title",
      original_prompt: "orig",
      optimized_prompt: "opt",
      explanation: "ex",
      mode: "better",
      provider: "gemini",
    });
  });
});
