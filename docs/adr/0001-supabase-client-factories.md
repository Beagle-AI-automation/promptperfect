# ADR 0001 — Supabase client factories (server vs browser)

- Status: accepted
- Date: 2026-10-10

## Context

Supabase clients were instantiated in four places (`lib/supabase.ts`,
`lib/client/supabase.ts`, `lib/client/supabaseBrowser.ts`,
`lib/server/supabase.ts`) with an identical exported name
(`getSupabaseClient`), inviting wrong-module imports. Worse, server-only
helpers (`getSupabaseAdminClient`, URL/key trimmers) lived in a `client/`
module, and a placeholder URL from `.env.example` produced a client that
failed at request time instead of at creation.

## Decision

- `lib/server/supabase.ts` is the single home for server credentials:
  `createRouteHandlerClient` (cookie session), `getServiceClient`
  (service-role, RLS bypass), `getSupabaseAdminClient`, `getSupabaseUrl`.
  It imports `next/headers` and must never be imported by browser code.
- `lib/client/supabase.ts` keeps exactly one export: the browser singleton.
  `lib/client/supabaseBrowser.ts` keeps the fresh-instance variant (its
  singleton-avoidance fixes a stale-session bug on `/profile` — see its
  comment; unifying the two would regress it).
- Shared pure env helpers live in `lib/env.ts`, usable from anywhere.
- Placeholder/empty Supabase URLs normalize to `null` ("no backend"), so
  callers take local fallbacks instead of hitting a dead domain.
- Deleted `lib/supabase.ts` and legacy `001–003_*.sql` (superseded by the
  timestamped series); all importers repointed, no behavior change.

## Consequences

- Import path encodes runtime: `@/lib/server/...` vs `@/lib/client/...`.
- RLS bypass stays explicit (service/admin getters) with the documented
  invariant: every caller scopes writes/reads with `.eq('user_id', …)`.
