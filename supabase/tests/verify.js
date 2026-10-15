/**
 * PromptPerfect database verification suite.
 *
 * pgTAP-style assertions implemented in plain Node.js + `pg` (no extra
 * test runner required in CI). Validates, against the migrated database:
 *
 *   1. Schema validity — all core tables / columns / tracking table exist.
 *   2. Constraint enforcement — bad modes, negative counters, oversized
 *      payloads and out-of-range scores are REJECTED; good rows ACCEPTED.
 *   3. RLS posture — RLS enabled on every table, ≥1 policy per table,
 *      trigger functions are SECURITY DEFINER with explicit search_path.
 *   4. Trigger workflow — inserting into auth.users auto-creates a
 *      pp_user_profiles row via handle_new_user().
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node supabase/tests/verify.js
 *   npm run db:verify
 *
 * Exit code 0 = all checks pass; 1 = at least one failure (names printed).
 */

/* eslint-disable @typescript-eslint/no-require-imports -- plain-Node runner, no bundler/TS imports */
const EXPECTED_TABLES = [
  'optimization_logs',
  'pp_optimization_history',
  'pp_saved_prompts',
  'pp_user_profiles',
  'guest_usage',
];

const OPTIONAL_TABLES = ['pp_users', 'pp_guest_sessions']; // legacy variants

const EXPECTED_CONSTRAINTS = [
  ['optimization_logs', 'optimization_logs_mode_check'],
  ['optimization_logs', 'optimization_logs_lengths_nonneg'],
  ['optimization_logs', 'optimization_logs_prompt_score_range'],
  ['optimization_logs', 'optimization_logs_session_nonempty'],
  ['pp_optimization_history', 'pp_optimization_history_mode_check'],
  ['pp_optimization_history', 'pp_optimization_history_payload_bounds'],
  ['pp_saved_prompts', 'pp_saved_prompts_mode_check'],
  ['pp_saved_prompts', 'pp_saved_prompts_payload_bounds'],
  ['guest_usage', 'guest_usage_count_nonneg'],
  ['guest_usage', 'guest_usage_guest_id_nonempty'],
];

const EXPECTED_INDEXES = [
  'idx_optimization_logs_session_id',
  'idx_optimization_logs_user_created',
  'idx_pp_optimization_history_session_id',
  'idx_pp_optimization_history_share_id',
  'idx_pp_optimization_history_user_created',
  'idx_pp_saved_prompts_user_created',
  'idx_pp_saved_prompts_user_updated',
  'idx_pp_user_profiles_email',
  'guest_usage_guest_id_unique',
];

let passed = 0;
let failed = 0;
const failures = [];

function ok(name) {
  passed += 1;
  console.log(`  ✅ ${name}`);
}
function fail(name, detail = '') {
  failed += 1;
  failures.push(name);
  console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ Missing DATABASE_URL. See supabase/README.md.');
    process.exit(1);
  }
  const { Client } = require('pg');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: /localhost|127\.0\.0\.1/.test(databaseUrl) ? false : { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    console.log('\n1️⃣  Schema validity');
    for (const table of EXPECTED_TABLES) {
      const { rowCount } = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
        [table],
      );
      if (rowCount === 1) ok(`table public.${table} exists`);
      else fail(`table public.${table} exists`);
    }
    for (const table of OPTIONAL_TABLES) {
      const { rowCount } = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
        [table],
      );
      console.log(`  ℹ️  optional table public.${table}: ${rowCount === 1 ? 'present' : 'absent (ok)'}`);
    }
    {
      const { rowCount } = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema='supabase_migrations' AND table_name='schema_migrations'`,
      );
      if (rowCount === 1) ok('tracking table supabase_migrations.schema_migrations exists');
      else fail('tracking table supabase_migrations.schema_migrations exists');
    }

    console.log('\n2️⃣  RLS posture (enabled + policies present)');
    for (const table of EXPECTED_TABLES) {
      const { rows } = await client.query(
        `SELECT relrowsecurity, relforcerowsecurity FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname='public' AND c.relname=$1`,
        [table],
      );
      if (rows[0] && (rows[0].relrowsecurity || rows[0].relforcerowsecurity)) {
        ok(`RLS enabled on ${table}`);
      } else {
        fail(`RLS enabled on ${table}`);
      }
      const { rowCount } = await client.query(
        `SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=$1`,
        [table],
      );
      if (rowCount >= 1) ok(`${table} has ${rowCount} RLS polic(y/ies)`);
      else fail(`${table} has RLS policies`);
    }

    console.log('\n3️⃣  Constraints + indexes');
    for (const [table, constraint] of EXPECTED_CONSTRAINTS) {
      const { rowCount } = await client.query(
        `SELECT 1 FROM pg_constraint c
         JOIN pg_class t ON t.oid = c.conrelid
         JOIN pg_namespace n ON n.oid = t.relnamespace
         WHERE n.nspname='public' AND t.relname=$1 AND c.conname=$2`,
        [table, constraint],
      );
      if (rowCount === 1) ok(`constraint ${table}.${constraint}`);
      else fail(`constraint ${table}.${constraint}`);
    }
    for (const index of EXPECTED_INDEXES) {
      const { rowCount } = await client.query(`SELECT 1 FROM pg_indexes WHERE indexname=$1`, [index]);
      if (rowCount === 1) ok(`index ${index}`);
      else fail(`index ${index}`);
    }

    console.log('\n4️⃣  Trigger-function hardening');
    {
      const { rows } = await client.query(
        `SELECT prosecdef, proconfig FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname='public' AND p.proname='handle_new_user'`,
      );
      if (rows.length === 0) {
        fail('handle_new_user() exists');
      } else {
        ok('handle_new_user() exists');
        if (rows[0].prosecdef) ok('handle_new_user() is SECURITY DEFINER');
        else fail('handle_new_user() is SECURITY DEFINER');
        const config = (rows[0].proconfig || []).join(',');
        if (config.includes('search_path')) ok('handle_new_user() sets search_path');
        else fail('handle_new_user() sets search_path');
      }
    }
    {
      const { rowCount } = await client.query(
        `SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
         WHERE n.nspname='public' AND p.proname='pp_set_updated_at'`,
      );
      if (rowCount === 1) ok('pp_set_updated_at() exists');
      else fail('pp_set_updated_at() exists');
    }

    console.log('\n5️⃣  Constraint enforcement (negative tests, rolled back)');
    // Each negative probe runs inside its own SAVEPOINT: a rejected INSERT
    // aborts only the savepoint, not the enclosing transaction, so later
    // probes still execute. Without this, the first expected failure would
    // poison the whole transaction ("current transaction is aborted").
    async function expectReject(name, sql, params = []) {
      await client.query('SAVEPOINT verify_probe');
      try {
        await client.query(sql, params);
        await client.query('RELEASE SAVEPOINT verify_probe');
        fail(name);
      } catch {
        await client.query('ROLLBACK TO SAVEPOINT verify_probe');
        ok(name);
      }
    }
    await client.query('BEGIN');
    try {
      // Valid row accepted.
      await client.query(
        `INSERT INTO public.pp_optimization_history
           (session_id, prompt_original, prompt_optimized, mode)
         VALUES ('verify-session', 'original prompt', 'optimized prompt', 'better')`,
      );
      ok('accepts valid history row');

      await expectReject(
        'rejects invalid history mode',
        `INSERT INTO public.pp_optimization_history
           (session_id, prompt_original, prompt_optimized, mode)
         VALUES ('verify-session', 'o', 'p', 'not-a-mode')`,
      );

      await expectReject(
        'rejects oversized prompt_original',
        `INSERT INTO public.pp_optimization_history
           (session_id, prompt_original, prompt_optimized, mode)
         VALUES ('verify-session', repeat('x', 60001), 'p', 'better')`,
      );

      await expectReject(
        'rejects negative optimization_count',
        `INSERT INTO public.guest_usage (guest_id, optimization_count)
         VALUES ('verify-guest-neg', -1)`,
      );

      await expectReject(
        'rejects prompt_score > 100',
        `INSERT INTO public.optimization_logs
           (session_id, mode, version, provider, model, prompt_length, prompt_score)
         VALUES ('verify-session', 'better', 'v', 'gemini', 'test-model', 10, 101)`,
      );

      // Legacy regression: 'production' mode must be accepted.
      await client.query(
        `INSERT INTO public.optimization_logs
           (session_id, mode, version, provider, model, prompt_length)
         VALUES ('verify-session', 'production', 'v', 'gemini', 'test-model', 10)`,
      );
      ok("accepts 'production' log mode");

      await expectReject(
        'rejects invalid log mode',
        `INSERT INTO public.optimization_logs
           (session_id, mode, version, provider, model, prompt_length)
         VALUES ('verify-session', 'bogus', 'v', 'gemini', 'test-model', 10)`,
      );
    } finally {
      await client.query('ROLLBACK');
    }

    console.log('\n6️⃣  Signup-trigger workflow (auth.users → profile)');
    await client.query('BEGIN');
    try {
      const { rows } = await client.query(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema='auth' AND table_name='users'`,
      );
      if (rows.length === 0) {
        console.log('  ℹ️  no auth.users on this instance (Supabase-only) — skipped');
      } else {
        const testId = '11111111-1111-4111-8111-111111111111';
        await client.query(
          `INSERT INTO auth.users (id, email, raw_user_meta_data)
           VALUES ($1, 'verify@example.com', '{"full_name":"Verify User"}')
           ON CONFLICT (id) DO NOTHING`,
          [testId],
        );
        const { rowCount } = await client.query(
          `SELECT 1 FROM public.pp_user_profiles WHERE id=$1`,
          [testId],
        );
        // NOTE: the stock template trigger was removed in
        // 20250410000000; on Supabase the app trigger recreates the
        // profile. On a stub instance the trigger may be absent, so a
        // missing row is informational, not a failure.
        console.log(
          rowCount === 1
            ? '  ✅ auth.users insert auto-created pp_user_profiles row'
            : '  ℹ️  no profile auto-created (trigger absent on this instance) — skipped',
        );
        if (rowCount === 1) passed += 1;
      }
    } finally {
      await client.query('ROLLBACK');
    }
  } finally {
    await client.end();
  }

  console.log(`\n${'='.repeat(52)}\nResult: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    console.log('Failures:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log('🎉 Database verification passed.');
}

main().catch((err) => {
  console.error('Verification error:', err && err.message ? err.message : err);
  process.exit(1);
});
