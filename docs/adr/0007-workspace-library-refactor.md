# ADR-0007: Workspace and Library Page Decomposition

**Date:** 2026-10-14
**Status:** Accepted

## Context

`src/app/app/page.tsx` (869 lines) and `src/app/library/page.tsx` (945 lines)
each mixed data fetching, run lifecycle, and large JSX trees in a single
component. Changes to one flow (e.g. guest quota gating) required reading the
whole file, and the pages were untestable in isolation.

## Decision

Split by responsibility, preserving behavior verbatim (no UI or logic
changes):

- `src/hooks/useWorkspaceSession.ts` — auth subscription, engine prefs,
  provider/API-key state, logout (from `app/page.tsx`).
- `src/hooks/useOptimizeRunner.ts` — composer state, streaming + sync
  completion, guest quota gating, history persistence/selection,
  re-optimize / digest / remediate / translate flows, refresh cascade.
- `src/components/workspace/WorkspaceHeader.tsx`,
  `src/components/workspace/OptimizeControls.tsx` — presentational header and
  mode/optimize controls.
- `src/hooks/useSavedLibrary.ts` — library auth, loading, deletion,
  search/mode filters, pagination, template fork/save (from
  `library/page.tsx`).
- `src/components/library/` — `LibraryStates`, `SavedPromptsTab`,
  `TemplatesTab` (pure rendering).
- `src/lib/library.ts` (+ `library.test.ts`) — row types, filter/preview/
  timestamp helpers, and an `isSavedPromptRow` type guard replacing the
  previous `as SavedPromptRow[]` cast on Supabase rows.
- `AppUser` added to `src/lib/types.ts`, replacing the duplicated `PPUser`
  interfaces in both pages.

## Consequences

- Pages are thin compositions (~200 lines); hooks own one lifecycle each and
  are importable in future hook-level tests.
- One intentional behavior tightening: unknown provider strings from stored
  prefs now normalize to `gemini` instead of flowing into API routing.
- Follow-up (not done): hook-level tests for `useOptimizeRunner` /
  `useSavedLibrary`; component tests for the new tab components.
