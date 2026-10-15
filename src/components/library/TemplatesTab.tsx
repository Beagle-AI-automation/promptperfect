'use client';

import { Bookmark, BookmarkPlus, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { PROMPT_TEMPLATES, TEMPLATE_CATEGORIES } from '@/lib/promptTemplates';
import type { PromptTemplate, TemplateCategory } from '@/lib/promptTemplates';
import { modeBadgeLabel } from '@/lib/library';

export interface TemplatesTabProps {
  filteredTemplates: PromptTemplate[];
  tplCategory: TemplateCategory | 'All';
  onCategoryChange: (c: TemplateCategory | 'All') => void;
  templateCountByCategory: Map<string, number>;
  tplError: string | null;
  tplExpandedId: string | null;
  onToggleExpand: (id: string | null) => void;
  isTplSaved: (id: string) => boolean;
  tplSavingId: string | null;
  onUseTemplate: (tpl: PromptTemplate) => void;
  onSaveTemplate: (tpl: PromptTemplate) => void;
}

/** "Templates" tab: category pills + curated production-ready prompts. */
export function TemplatesTab({
  filteredTemplates,
  tplCategory,
  onCategoryChange,
  templateCountByCategory,
  tplError,
  tplExpandedId,
  onToggleExpand,
  isTplSaved,
  tplSavingId,
  onUseTemplate,
  onSaveTemplate,
}: TemplatesTabProps) {
  return (
    <>
      {/* Templates: curated production-ready prompts, works offline */}
      <div
        className="mb-4 flex flex-wrap gap-2"
        role="group"
        aria-label="Filter templates by category"
      >
        {(['All', ...TEMPLATE_CATEGORIES] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onCategoryChange(c)}
            aria-pressed={tplCategory === c}
            className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors ${
              tplCategory === c
                ? 'border-accent bg-accent/20 text-[#ECECEC]'
                : 'border-[#2a2a2a] bg-[#0A0A0A] text-[#B0B0B0] hover:border-accent/50'
            }`}
          >
            {c === 'All'
              ? `All (${PROMPT_TEMPLATES.length})`
              : `${c} (${templateCountByCategory.get(c) ?? 0})`}
          </button>
        ))}
      </div>

      {tplError ? (
        <div
          className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-center text-sm text-red-400"
          role="alert"
        >
          {tplError}
        </div>
      ) : null}

      {filteredTemplates.length === 0 ? (
        <p className="py-12 text-center text-sm text-[#8a8a8a]">
          No templates match your filters.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filteredTemplates.map((tpl) => {
            const expanded = tplExpandedId === tpl.id;
            const saved = isTplSaved(tpl.id);
            const saving = tplSavingId === tpl.id;
            return (
              <li
                key={tpl.id}
                className="rounded-xl border border-[#252525] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-4 transition hover:border-[#3F3F46]"
              >
                <button
                  type="button"
                  onClick={() => onToggleExpand(expanded ? null : tpl.id)}
                  className="flex w-full items-start justify-between gap-2 text-left"
                  aria-expanded={expanded}
                >
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-[family-name:var(--font-space-grotesk),sans-serif] text-[15px] font-medium text-[#E7E6D9]">
                      {tpl.title}
                    </h2>
                    <p className="mt-1 truncate text-[13px] text-[#aaa]">
                      {tpl.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded bg-accent/20 px-2 py-0.5 text-[11px] font-medium text-[#8B9AFF]">
                      {tpl.category}
                    </span>
                    <span className="rounded bg-green-500/20 px-2 py-0.5 text-[11px] font-medium text-green-400">
                      {modeBadgeLabel(tpl.mode)}
                    </span>
                    {expanded ? (
                      <ChevronUp className="h-4 w-4 text-[#8a8a8a]" aria-hidden />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#8a8a8a]" aria-hidden />
                    )}
                  </div>
                </button>

                {expanded && (
                  <div className="mt-4 border-t border-[#252525] pt-4">
                    <p className="mb-1 text-[11px] text-[#8a8a8a]">
                      Built from starter
                    </p>
                    <p className="mb-3 text-[13px] italic text-[#888]">
                      “{tpl.original_prompt}”
                    </p>
                    <p className="mb-1 text-[11px] text-[#8a8a8a]">
                      Template — fill the {'{{PLACEHOLDERS}}'} then optimize
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-[#ECECEC]">
                      {tpl.optimized_prompt}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onUseTemplate(tpl)}
                        className="inline-flex items-center gap-1.5 rounded-[10px] cta-gradient px-4 py-2 text-[13px] font-semibold text-white transition hover:opacity-90"
                      >
                        <Sparkles size={14} aria-hidden />
                        Use in optimizer
                      </button>
                      {saved ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-text">
                          <Bookmark size={16} aria-hidden />
                          Saved!
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void onSaveTemplate(tpl)}
                          disabled={saving}
                          className="inline-flex items-center gap-1.5 text-sm text-[#B0B0B0] transition hover:text-accent-text disabled:opacity-50"
                        >
                          <BookmarkPlus size={16} aria-hidden />
                          {saving ? 'Saving…' : 'Save to library'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
