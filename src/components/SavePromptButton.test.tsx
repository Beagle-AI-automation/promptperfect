import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SavePromptButton } from './SavePromptButton';

vi.mock('@/lib/client/supabaseBrowser', () => ({
  createSupabaseBrowserClient: vi.fn(() => ({})),
}));

const mockHeaders = vi.fn(async () => ({
  Authorization: 'Bearer test-token',
}));

vi.mock('@/lib/client/promptPerfectAuthHeaders', () => ({
  getPromptPerfectAuthHeaders: () => mockHeaders(),
}));

describe('SavePromptButton', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({}, { status: 200 }),
      ) as unknown as typeof fetch,
    );
    mockHeaders.mockResolvedValue({
      Authorization: 'Bearer test-token',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders nothing without userId', () => {
    const { container } = render(
      <SavePromptButton
        originalPrompt="a"
        optimizedPrompt="b"
        explanation="c"
        mode="better"
        provider="gemini"
        userId={null}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows Save to Library when signed in', () => {
    render(
      <SavePromptButton
        originalPrompt="orig"
        optimizedPrompt="opt"
        explanation="expl"
        mode="better"
        provider="gemini"
        userId="user-1"
      />,
    );
    expect(screen.getByRole('button', { name: /Save to Library/i })).toBeInTheDocument();
  });

  it('shows title input and saves via API', async () => {
    render(
      <SavePromptButton
        originalPrompt="orig"
        optimizedPrompt="opt"
        explanation="expl"
        mode="better"
        provider="gemini"
        userId="user-1"
      />,
    );
    fireEvent.click(
      screen.getAllByRole('button', { name: /Save to Library/i })[0]!,
    );

    const titleInput = screen.getByPlaceholderText(/Name this prompt/i);
    fireEvent.change(titleInput, { target: { value: 'My title' } });
    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });
    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe('/api/saved-prompts');
    expect(call[1]?.method).toBe('POST');
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body.title).toBe('My title');
    expect(body.original_prompt).toBe('orig');
  });

  it('shows Saved! when alreadySaved', () => {
    render(
      <SavePromptButton
        originalPrompt="a"
        optimizedPrompt="b"
        explanation="c"
        mode="better"
        provider="gemini"
        userId="user-1"
        alreadySaved
      />,
    );
    expect(screen.getByText(/Saved!/i)).toBeInTheDocument();
  });
});
