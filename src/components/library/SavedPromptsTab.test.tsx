'use client';

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SavedPromptsTab } from './SavedPromptsTab';
import type { SavedPromptRow } from '@/lib/library';

function row(over: Partial<SavedPromptRow> = {}): SavedPromptRow {
  return {
    id: 'r1',
    user_id: 'u1',
    title: 'My prompt',
    original_prompt: 'original text here',
    optimized_prompt: 'optimized text here',
    explanation: '',
    mode: 'better',
    provider: 'gemini',
    created_at: new Date().toISOString(),
    ...over,
  };
}

const BASE = {
  totalCount: 1,
  searchQuery: '',
  onSearchChange: () => {},
  modeFilter: 'all' as const,
  onModeFilterChange: () => {},
  loading: false,
  error: null,
  visibleRows: [row()],
  filteredCount: 1,
  hasMore: false,
  remainingCount: 0,
  onLoadMore: () => {},
  expandedId: null,
  onToggleExpand: () => {},
  onReoptimize: () => {},
  onRequestDelete: () => {},
  skeleton: <div data-testid="skeleton" />,
  emptyState: <div data-testid="empty" />,
};

describe('SavedPromptsTab', () => {
  it('renders rows with badges and expands details with actions', () => {
    const onToggleExpand = vi.fn();
    const onReoptimize = vi.fn();
    const onRequestDelete = vi.fn();
    render(
      <SavedPromptsTab
        {...BASE}
        onToggleExpand={onToggleExpand}
        onReoptimize={onReoptimize}
        onRequestDelete={onRequestDelete}
      />,
    );
    expect(screen.getByText('My prompt')).toBeInTheDocument();

    fireEvent.click(screen.getByText('My prompt'));
    expect(onToggleExpand).toHaveBeenCalledWith('r1');

    render(
      <SavedPromptsTab
        {...BASE}
        expandedId="r1"
        onToggleExpand={onToggleExpand}
        onReoptimize={onReoptimize}
        onRequestDelete={onRequestDelete}
      />,
    );
    fireEvent.click(screen.getByText('Re-optimize'));
    expect(onReoptimize).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Delete'));
    expect(onRequestDelete).toHaveBeenCalledWith('r1');
  });

  it('forwards search and mode filter changes', () => {
    const onSearchChange = vi.fn();
    const onModeFilterChange = vi.fn();
    render(
      <SavedPromptsTab
        {...BASE}
        onSearchChange={onSearchChange}
        onModeFilterChange={onModeFilterChange}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText('Search prompts…'), {
      target: { value: 'hello' },
    });
    expect(onSearchChange).toHaveBeenCalledWith('hello');
    fireEvent.click(screen.getByRole('button', { name: 'CoT' }));
    expect(onModeFilterChange).toHaveBeenCalledWith('cot');
  });

  it('renders loading, error, empty, no-match, and load-more states', () => {
    const { rerender } = render(<SavedPromptsTab {...BASE} loading={true} />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();

    rerender(<SavedPromptsTab {...BASE} error="boom" />);
    expect(screen.getByText('boom')).toBeInTheDocument();

    rerender(<SavedPromptsTab {...BASE} totalCount={0} visibleRows={[]} filteredCount={0} />);
    expect(screen.getByTestId('empty')).toBeInTheDocument();

    rerender(<SavedPromptsTab {...BASE} visibleRows={[]} filteredCount={0} />);
    expect(screen.getByText('No prompts match your filters')).toBeInTheDocument();
    expect(
      screen.getByText('Try a different search term or reset the mode filter.')
    ).toBeInTheDocument();

    const onLoadMore = vi.fn();
    rerender(
      <SavedPromptsTab
        {...BASE}
        hasMore={true}
        remainingCount={7}
        onLoadMore={onLoadMore}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /load more/i }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
