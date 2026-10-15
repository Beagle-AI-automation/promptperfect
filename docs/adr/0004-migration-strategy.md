# ADR 0004 — Migration strategy: versioned SQL as source of truth

- Status: accepted
- Date: 2026-10-12

## Context

Schema grew organically: `setup.sql`, `run-all.sql`, `SETUP_SHARE_FEATURE.sql`,
`fix_model_column.sql` plus 22 timestamped files in `migrations/`, with the old
`migrate.js` creating one table via a non-existent `exec_sql` RPC. No ordering
guarantee, no idempotency, and `CREATE POLICY IF NOT EXISTS` (invalid Postgres)
in two files meant fresh databases could never build from scratch.

## Decision

- `supabase/migrations/*.sql` in lexical (timestamp) order is the **only** schema
  source of truth. New schema goes in a new timestamped file, never in legacy scripts.
- `supabase/migrate.js` (plain SQL + `pg`) applies each file **once, in its own
  transaction**, recording `version` in `supabase_migrations.schema_migrations`.
  Re-runs are no-ops; `--dry-run` previews; `--check` gates deploys.
- Legacy scripts are **deprecated, not deleted** (backward-compat for anyone
  pasting into the SQL Editor) and marked with headers pointing here.
- All migrations must be **additive + idempotent** (expand-and-contract for anything
  breaking: add → dual-write → backfill → switch → drop across ≥2 releases).
- Locking discipline: new constraints use `ADD ... NOT VALID` → `VALIDATE`, so
  large production tables aren't rewrite-locked.

## Consequences

- Fresh DB (`auth_stub` + `migrate` + `verify`) converges to the same schema as a
  long-lived DB that applied each migration at release time.
- Editing an already-applied migration is forbidden; ship a repair migration instead.
- `DATABASE_URL` (direct Postgres) is required for DDL; anon/service keys are
  data-plane only.
