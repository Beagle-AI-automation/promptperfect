# ADR 0002 — Hand-rolled request validation (no Zod)

- Status: accepted
- Date: 2026-10-10

## Context

API routes hand-rolled input checks ad hoc (`typeof` + `trim()` scattered per
route), with inconsistent error envelopes and no length caps on prompts.
Zod is the standard fix, but it is only a transitive dependency here and
`npm install` is broken upstream (`ai@6` pins a `@ai-sdk/provider-utils`
version missing from the registry), so adding it would break `npm ci`
reproducibility.

## Decision

- `lib/apiSchemas.ts`: typed, tested, zero-dependency parsers
  (`parseOptimizeBody`, `parseFeedbackBody`, `parseMode`, `parseProvider`)
  with a shared `MAX_PROMPT_CHARS = 100_000` abuse cap and one error
  envelope (`{ error }` + 400).
- Both optimize routes share `parseOptimizeBody`; unified message
  "Missing or empty prompt".
- If `npm install` recovers upstream, revisit: replace internals with Zod
  schemas keeping the same function signatures and tests green.

## Consequences

- No new supply-chain surface; validation is unit-tested pure logic.
- Contributors must extend `apiSchemas.ts` for new payload routes instead of
  inline checks.
