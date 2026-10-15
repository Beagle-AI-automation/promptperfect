# Share Feature Setup

> Current flow (migrations-based). The legacy one-shot scripts
> (`SETUP_SHARE_FEATURE.sql`, old `migrate.js` behavior) are deprecated —
> use the commands below. Full backend reference: `supabase/README.md`.

## Quick Start

```bash
# Direct Postgres connection string (Supabase Dashboard → Database → Connection string,
# or a local ephemeral DB — see supabase/README.md)
export DATABASE_URL='postgresql://postgres:password@db.<ref>.supabase.co:5432/postgres'

npm run db:migrate   # creates pp_optimization_history + all indexes/policies (idempotent)
npm run db:verify    # asserts share_id index, RLS policies, constraint guards
```

## What this creates

- `pp_optimization_history` table (`session_id`, `prompt_original`, `prompt_optimized`,
  `mode`, `explanation`, `share_id` UNIQUE, `user_id`, `provider`, `optimize_session_id`)
- Indexes on `session_id`, `share_id` (partial, non-null), `created_at DESC`,
  `(user_id, created_at)` for history timelines
- RLS: `anon` INSERT guarded by payload checks (mode allowlist + length bounds),
  open SELECT for guest history + share-link views, owner-only SELECT/UPDATE for
  authenticated users (see `docs/adr/0005-rls-patterns.md`)
- `CHECK` payload bounds (prompts ≤ 60000 chars, `share_id` 6–64 chars)

## Prerequisites

`.env.local` needs (see `.env.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>   # server-side only, never NEXT_PUBLIC_*
DATABASE_URL=postgresql://postgres:password@db.<ref>.supabase.co:5432/postgres
```

`DATABASE_URL` is required for DDL (`db:migrate`); the anon/service keys alone
cannot create tables.

## Testing the Share Feature

1. `npm run dev` → http://localhost:3000
2. Enter a prompt → **Optimize**
3. After completion, the **Share** button appears (row persisted with `historyId`)
4. Click Share → unique `share_id` → URL `/s/{share_id}`
5. Open the URL in incognito → public read-only view (no login)

Local-dev fixtures: `psql "$DATABASE_URL" -f supabase/tests/seed.sql` inserts a
shareable row (`share_id = seedshare01` → `/s/seedshare01`).

## Troubleshooting

**Share button not appearing?**
- `npm run db:migrate` then `npm run db:verify` — both must be green
- Check Supabase credentials in `.env.local`
- `pp_optimization_history` missing `share_id`? You ran the deprecated script —
  re-run `db:migrate` (adds the column idempotently)

**Migration failed?**
- A failed file rolls back fully and stays pending — fix forward with a new
  migration, then re-run `db:migrate`
- `role "anon" does not exist` on local Postgres → apply
  `supabase/tests/auth_stub.sql` first (ephemeral-only; never on Supabase)

## How It Works

1. Optimization completes → row saved to `pp_optimization_history`
2. Share button appears with the saved `historyId`
3. Clicking Share generates a unique `share_id` (`/api/share/generate`)
4. Share URL `/s/{share_id}` renders the public view (read-only)
5. On signup, guest rows are claimed to the account (`claim-guest-history`;
   see `docs/adr/0006-guest-usage-tracking.md`)
