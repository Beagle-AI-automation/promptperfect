# Supabase / PostgreSQL backend

Single source of truth: **`supabase/migrations/`**, applied in lexical order by
**`supabase/migrate.js`** (plain SQL + Node.js `pg` driver — no ORM, per project
constraint). Everything else in this directory is reference, test tooling, or docs.

## Layout

| Path | Purpose | Executed by CI? |
|---|---|---|
| `migrations/*.sql` | Versioned schema changes (`YYYYMMDDHHMMSS_description.sql`). **Add new schema here only.** | ✅ (`db.yml`) |
| `migrate.js` | Idempotent runner: per-file transactions + `supabase_migrations.schema_migrations` tracking. | ✅ |
| `tests/auth_stub.sql` | Ephemeral-only `auth` schema/roles stub for plain Postgres CI. **Never applied to Supabase** (platform owns `auth.*`). | ✅ (CI setup step) |
| `tests/verify.js` | pgTAP-style assertions: schema, CHECK enforcement (incl. negative tests), RLS posture, trigger workflows. | ✅ (`npm run db:verify`) |
| `tests/seed.sql` | Idempotent local-dev fixtures (fixed UUIDs, `ON CONFLICT DO NOTHING`). **Never run on production.** | ✅ (CI seed step) |
| `tests/monitoring.sql` | Read-only observability queries (slow queries, deadlocks, pool saturation, RLS inventory). | ❌ (manual) |
| `setup.sql`, `run-all.sql`, `SETUP_SHARE_FEATURE.sql`, `fix_model_column.sql` | **DEPRECATED** legacy setup scripts. Kept for SQL-Editor reference; may lag behind migrations. | ❌ |
| `SHARE_FEATURE_README.md` | Share-feature guide (points at the new flow). | ❌ |

## Quick start (zero manual intervention)

```bash
# 1. Clone + install
git clone <repo> && cd promptperfect && npm install

# 2. Connection string — direct Postgres (required for DDL).
#    Supabase Dashboard → Project Settings → Database → Connection string (URI).
#    Local ephemeral: postgresql://postgres:postgres@localhost:5432/mydb
export DATABASE_URL='postgresql://postgres:password@db.<ref>.supabase.co:5432/postgres'

# 3. Migrate (creates everything, re-runnable no-op when up to date)
npm run db:migrate

# 4. Verify (47 assertions: tables, constraints, RLS, trigger workflows)
npm run db:verify
```

Full variable reference: `.env.example` (`DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

`migrate.js` loads `.env.local` then `.env` automatically. Useful flags:

```bash
node supabase/migrate.js --dry-run   # list pending, apply nothing
node supabase/migrate.js --check      # exit 1 if any migration is pending (pre-deploy gate)
```

## Local ephemeral Postgres (no Supabase project needed)

```bash
# Homebrew Postgres already running? Then:
psql -U postgres -c "CREATE DATABASE pp_local;"
export DATABASE_URL='postgresql://postgres@localhost:5432/pp_local'
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
psql "$DATABASE_URL" -f supabase/tests/auth_stub.sql
npm run db:migrate && npm run db:verify

# Optional fixtures for UI development:
psql "$DATABASE_URL" -f supabase/tests/seed.sql
```

## Writing a migration

1. Name: `supabase/migrations/20261012143000_short_snake_case.sql` (timestamp must sort
   after the latest file; `date +%Y%m%d%H%M%S`).
2. Rules (enforced in review, asserted in `verify.js` where feasible):
   - **Additive + backward-compatible only** (expand-and-contract). No `DROP COLUMN`,
     no type narrowing, no PK rewrites. If a breaking change is unavoidable, ship it
     as *add new → dual-write → backfill → switch → drop* across ≥2 migrations.
   - **Idempotent**: `IF NOT EXISTS` / `DROP ... IF EXISTS` + `CREATE`, `ADD COLUMN IF
     EXISTS`-style guards. `migrate.js` re-runs safely, and fresh + long-lived DBs
     must converge to the same schema.
   - **SQL style**: `UPPERCASE` keywords, `snake_case` tables/columns/constraints/indexes,
     explicit aliases, `public.`-qualified object names.
   - **Constraints**: new text payloads get length bounds; counters get `>= 0`;
     enums get `CHECK (col IN (...))`. Name them `<table>_<aspect>`.
   - **RLS**: keep `ENABLE ROW LEVEL SECURITY` on; new policies are `DROP IF EXISTS` +
     `CREATE` with a stable name. Never open a table without a `WITH CHECK` guard.
   - **Functions**: `SECURITY DEFINER` + `SET search_path = public` on all trigger
     functions (privilege-escalation hardening).
   - **Lock-safety**: new constraints use `ADD ... NOT VALID` → `VALIDATE`
     (scan blocks writes, not reads). Indexes are plain `CREATE INDEX` — never
     `CONCURRENTLY` (it cannot run inside the runner's per-file transaction).
     For tables over ~1M rows, coordinate a maintenance window instead.
3. Test locally: fresh DB → `db:migrate` → `db:seed` → `db:verify` (all green), then
   second `db:migrate` is a no-op.
4. Rollback: every migration header documents reverse steps by object name
   (policies → triggers → indexes → constraints). Production restores use
   Supabase point-in-time recovery, not down-migrations.

## Schema map (logical namespaces in one `public` schema)

Supabase hosts a single app schema, so separation is by **prefix convention**
(see ADR-0004):

- **Core optimizer**: `optimization_logs` (run analytics + feedback), `pp_optimization_history`
  (shareable results, `share_id`), `pp_saved_prompts` (user library → `source_history_id`).
- **Identity**: `auth.users` (platform-owned) → `pp_user_profiles` via `handle_new_user()`
  trigger. `pp_users` / `pp_guest_sessions` are **legacy custom-auth** (kept read-compatible,
  not extended).
- **Guest / free-tier**: `guest_usage` (`guest_id` fingerprint → `optimization_count`);
  service-role-only writes from `/api/guest-usage`, migrated to a user account on
  signup (see ADR-0006).
- **Infra**: `supabase_migrations.schema_migrations` (runner bookkeeping, outside RLS).

## RLS model (summary; full matrix in ADR-0005)

| Table | anon | authenticated | service_role |
|---|---|---|---|
| `optimization_logs` | INSERT (payload-guarded) / SELECT / UPDATE own session | SELECT / UPDATE own `user_id` rows | bypass (full) |
| `pp_optimization_history` | INSERT (payload-guarded) / SELECT guest rows | SELECT/UPDATE own `user_id` rows | bypass (full) |
| `pp_saved_prompts` | none | SELECT/INSERT/UPDATE/DELETE own rows | bypass (full) |
| `pp_user_profiles` | none | SELECT/UPDATE/INSERT own row | bypass (full) |
| `guest_usage` | none (blocked) | none (blocked) | full (API route only) |

Verify posture any time: `npm run db:verify`, or run section 5 of
`tests/monitoring.sql` in the SQL Editor (disabled-RLS query must return zero rows).

## CI / pre-deployment gates

`.github/workflows/db.yml` (runs when `supabase/**` changes): ephemeral
`postgres:16` → `auth_stub.sql` → `migrate.js` → idempotency `--check` →
`seed.sql` → `verify.js`. Merge is blocked on red.

Pre-deploy checklist for production Supabase:

1. `node supabase/migrate.js --check` against a staging clone exits 0 (nothing pending
   unexpectedly) — or lists exactly the migrations under review.
2. `db.yml` green on the PR.
3. Non-nullable/backfill migrations use the `NOT VALID` → `VALIDATE` pattern
   (see `20261012000000`) to avoid long write locks.
4. Point-in-time recovery window confirmed before any data-touching migration.

## Troubleshooting

| Symptom | Cause → Fix |
|---|---|
| `Missing DATABASE_URL` | Export it (see Quick start). Supabase anon/service keys alone cannot run DDL. |
| `role "anon" does not exist` on local Postgres | Apply `tests/auth_stub.sql` first (CI does this automatically). |
| `relation "auth.users" does not exist` | Same — stub first on ephemeral; on Supabase it always exists. |
| Migration fails mid-file | File ran in one transaction → rolled back, stays pending. Fix the file, re-run. |
| `db:verify` reports missing constraint | A migration was edited after applying — reset the DB or add a new repair migration. |
