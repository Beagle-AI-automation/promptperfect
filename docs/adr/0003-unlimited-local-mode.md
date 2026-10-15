# ADR 0003 — Unlimited local-dev mode

- Status: accepted
- Date: 2026-10-10

## Context

Local development has no Supabase backend (no Auth, no Postgres), yet the
product gates (guest quota, sign-in modals, auth-required server keys) assume
one. Developing/using the app locally was blocked by design.

## Decision

- `NEXT_PUBLIC_UNLIMITED_MODE=true` (plus optional `UNLIMITED_MODE` server
  twin, read by `lib/config.ts`) disables every artificial limitation:
  guest quota gate + modal + token bar, server rate limits, and the
  sign-in requirement when a server provider key exists.
- Supabase-backed features degrade to localStorage fallbacks (history,
  library, share-via-clipboard, stats-zeros) instead of failing.
- Provider `baseURL`s are pinned to the real APIs and `PROMPTPERFECT_*`
  keys take precedence, so ambient shell variables (e.g. a global
  `OPENAI_BASE_URL` pointing at OpenRouter) can never hijack requests.
- Production default (flag unset) preserves exact product behavior; all
  unlimited branches are covered by the "default off" test cases.

## Consequences

- Never enable the flag in production: it removes quota and auth gates.
- New gates must check `isUnlimitedMode()` and degrade gracefully.
