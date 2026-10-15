# ADR 0005 — RLS and auth-boundary patterns

- Status: accepted
- Date: 2026-10-12

## Context

Tables mixed three auth eras: open `anon` analytics inserts, `auth.users`-owned rows,
and legacy `pp_users` custom auth. Two outages came from this seam: signup failed
with "Database error creating new user" (trigger insert blocked by RLS because
`auth.uid()` is NULL inside triggers), and fresh DBs had the profile function but
no trigger (the 20250410 cleanup removed both the broken template trigger and the
good one by shared name).

## Decision

- **RLS ON every table**, verified per role in `supabase/tests/verify.js`:
  - `optimization_logs`, `pp_optimization_history`: intentionally permissive
    `anon` INSERT (guest flows are core product), but hardened twice — `WITH CHECK`
    payload guards on the policy **and** `CHECK` constraints on the table, so a
    malformed/oversized/off-mode payload is rejected at both layers.
  - `pp_saved_prompts`, `pp_user_profiles`: strict owner-only (`auth.uid() = id /
    user_id`) for SELECT/INSERT/UPDATE/DELETE.
  - `guest_usage`: no `anon`/`authenticated` access at all; service-role-only via
    the API route (rate-limit integrity).
- **Trigger hardening**: `handle_new_user()` is `SECURITY DEFINER` +
  `SET search_path = public` + `SET LOCAL row_security = off` for its single
  profile insert, `ON CONFLICT DO NOTHING`, owned by `postgres`. The trigger
  `on_auth_user_created` is re-attached idempotently by the hardening migration.
- **Defense in depth**: API routes re-validate (see ADR-0002, no-Zod request
  validation); the DB is the final backstop, not the only check.

## Consequences

- `service_role` bypasses RLS by design — it must only ever live server-side
  (`SUPABASE_SERVICE_ROLE_KEY`, never `NEXT_PUBLIC_*`).
- New tables must ship with RLS + policies in the same migration, plus a `verify.js`
  assertion; CI blocks policy-less tables.
