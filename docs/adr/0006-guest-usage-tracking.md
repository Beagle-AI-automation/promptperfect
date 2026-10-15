# ADR 0006 — Guest-usage tracking and account migration

- Status: accepted
- Date: 2026-10-12

## Context

Anonymous visitors get 5 free optimizations, keyed by a client-generated fingerprint
(`nanoid`, localStorage) — no login wall. Two historical `guest_usage` shapes exist
(text-PK from 20250404, uuid-PK + unique `guest_id` from 20260401); both must keep
working against the same RLS + constraint set.

## Decision

- Canonical grain: **one row per `guest_id` fingerprint** with `optimization_count`,
  `last_used_at/mode/provider`. The hardening migration converges both shapes
  (ensures `id`, unique non-empty `guest_id`, `optimization_count >= 0`) without
  rewriting either PK (no table rewrite, no downtime).
- **Write path**: only the service role via `/api/guest-usage` (RLS denies anon/
  authenticated). The client never writes usage directly, so counts can't be forged
  or decremented from the browser.
- **Claim path**: on signup, guest history rows (`pp_optimization_history` with NULL
  `user_id`) are linked to the new account (`claim-guest-history` / `guest-migrate`
  routes); the profile trigger seeds `pp_user_profiles` (incl. backfilled
  `optimization_count`, `favorite_mode`).
- Quota constant lives in product code (`GUEST_TOKEN_LIMIT = 5`); the DB enforces
  shape/non-negativity, the API enforces the limit.

## Consequences

- Fingerprint rotation (cleared localStorage) resets quota — accepted trade-off for
  a frictionless trial; abuse backstop is server rate-limiting, not DB identity.
- Any future quota change is a code + (if structural) additive-migration change;
  historical rows remain valid.
