# ADR-0008: Design System — Tokens, shadcn/ui Primitives, Lucide, Dark-only

**Date:** 2026-10-14
**Status:** Accepted

## Context

The product had a consistent *look* but no *system*: the brand accent
(`#4552FF`) and the signature CTA gradient were duplicated across dozens of
files, radii/spacing were ad-hoc, empty/loading states were inconsistent,
several icon-only controls lacked accessible names, and ad-hoc SVGs sat
beside Lucide icons. The theme layer still carried dead light-mode code
(see ADR-0007 siblings / prior theme refactor).

## Decision

- **Dark-only.** `<html class="dark">` is the single path; `ThemeProvider`
  and the pre-paint theme script were removed as dead code (ADR sibling).
- **Semantic tokens** in `src/app/globals.css`, exposed to Tailwind v4 via
  `@theme` (`--color-background/card/border/muted/accent/ring/...`, radius
  scale). Values match the previous palette exactly, so adoption is a
  no-op visually.
- **shadcn/ui-style primitives** in `src/components/ui/`, authored in-repo
  (the shadcn model): `Button, Badge, Card, Input, Skeleton, Separator,
  SegmentedToggle, EmptyState`. Class composition uses `src/lib/utils.ts`
  (`cn` + `cvaLite`).
- **Lucide** as the single icon system. Intentionally retained raw SVG only
  where Lucide has no equivalent: the Google brand "G" (`auth/GoogleIcon`).
- **Accessibility:** global `:focus-visible` ring, `prefers-reduced-motion`
  support, live regions (`role=status`/`alert`) for save/feedback feedback,
  accessible names on icon-only controls, `aria-busy` + `sr-only` labels on
  skeleton loading.
- **Single-source brand assets:** `.cta-gradient` class for the CTA gradient;
  the accent is referenced via the `accent` token, not raw hex.

## Consequences

- Shared look/feel across landing, workspace, library, modals; empty and
  loading states are consistent (`EmptyState`, `Skeleton`).
- The brand gradient/accent change in one place.
- **Two empty-state components coexist** (`EmptyState` compact and
  `LibraryEmptyState` for the library's heroic/CTA states). Unifying would
  regress one of the two looks, so it is deferred intentionally.
- `cn` is the canonical `clsx` + `tailwind-merge` helper (dependency-free
  `npm install` reify is broken in this environment, so the two deps were
  added via `npm install --package-lock-only` + `npm ci`; the lockfile stays
  `npm ci`-consistent). This restores real Tailwind conflict resolution, so
  primitive variants can be overridden via `className` safely. Revisit the
  broken `npm install` separately if it blocks future dependency edits.
- WCAG: secondary greys (`#666`, `#71717A`) remain below 4.5:1; flagged as a
  design-owned contrast decision, not auto-changed.

## Follow-ups (not done)

- Consolidate the two empty-state primitives behind a flexible one.
- `cn` → canonical `clsx` + `tailwind-merge` (blocked on `npm install`).
- Contrast remediation for muted greys (design sign-off).
- Automated a11y/E2E (Playwright + axe).
