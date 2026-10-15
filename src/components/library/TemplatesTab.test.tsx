'use client';

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplatesTab } from './TemplatesTab';
import { PROMPT_TEMPLATES } from '@/lib/promptTemplates';
import type { PromptTemplate } from '@/lib/promptTemplates';

const BASE = {
  filteredTemplates: PROMPT_TEMPLATES.slice(0, 3),
  tplCategory: 'All' as const,
  onCategoryChange: () => {},
  templateCountByCategory: new Map<string, number>(),
  tplError: null,
  tplExpandedId: null,
  onToggleExpand: () => {},
  isTplSaved: () => false,
  tplSavingId: null,
  onUseTemplate: () => {},
  onSaveTemplate: () => {},
};

describe('TemplatesTab', () => {
  it('expands a template and fires use/save actions', () => {
    const onToggleExpand = vi.fn();
    const onUseTemplate = vi.fn();
    const onSaveTemplate = vi.fn();
    const tpl = BASE.filteredTemplates[0];
    if (!tpl) throw new Error('expected bundled templates');

    render(
      <TemplatesTab
        {...BASE}
        onToggleExpand={onToggleExpand}
        onUseTemplate={onUseTemplate}
        onSaveTemplate={onSaveTemplate}
      />,
    );
    fireEvent.click(screen.getByText(tpl.title));
    expect(onToggleExpand).toHaveBeenCalledWith(tpl.id);

    render(
      <TemplatesTab
        {...BASE}
        tplExpandedId={tpl.id}
        onToggleExpand={onToggleExpand}
        onUseTemplate={onUseTemplate}
        onSaveTemplate={onSaveTemplate}
      />,
    );
    fireEvent.click(screen.getByText('Use in optimizer'));
    expect(onUseTemplate).toHaveBeenCalledWith(tpl);
    fireEvent.click(screen.getByText('Save to library'));
    expect(onSaveTemplate).toHaveBeenCalledWith(tpl);
  });

  it('shows the saved badge instead of the save button', () => {
    const tpl = BASE.filteredTemplates[0] as PromptTemplate;
    render(
      <TemplatesTab
        {...BASE}
        tplExpandedId={tpl.id}
        isTplSaved={() => true}
      />,
    );
    expect(screen.getByText('Saved!')).toBeInTheDocument();
    expect(screen.queryByText('Save to library')).not.toBeInTheDocument();
  });

  it('shows saving state, errors, and category filtering', () => {
    const onCategoryChange = vi.fn();
    const tpl = BASE.filteredTemplates[0] as PromptTemplate;
    const { rerender } = render(
      <TemplatesTab
        {...BASE}
        tplExpandedId={tpl.id}
        tplSavingId={tpl.id}
        onCategoryChange={onCategoryChange}
      />,
    );
    expect(screen.getByText('Saving…')).toBeInTheDocument();

    rerender(<TemplatesTab {...BASE} tplError="quota reached" />);
    expect(screen.getByText('quota reached')).toBeInTheDocument();
  });
});
