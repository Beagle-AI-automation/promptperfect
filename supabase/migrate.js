/**
 * PromptPerfect database migration runner.
 *
 * Single source of truth: `supabase/migrations/*.sql` applied in lexical
 * (timestamp) order. Each file runs once, inside its own transaction, and is
 * recorded in `supabase_migrations.schema_migrations` so re-runs are safe
 * no-ops (idempotent).
 *
 * Tooling constraint: plain SQL + Node.js only (`pg` driver). No ORM.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node supabase/migrate.js
 *   npm run db:migrate
 *   node supabase/migrate.js --dry-run   # list pending, apply nothing
 *   node supabase/migrate.js --check      # exit 1 if any migration pending
 *
 * Env resolution (first set wins):
 *   DATABASE_URL (preferred — direct Postgres connection)
 * Otherwise the Supabase project URL + service-role key are accepted for
 * `verify`-style flows, but DDL still requires DATABASE_URL; the runner
 * exits with instructions instead of half-applying.
 *
 * .env.local is loaded first, then .env (local dev convenience).
 */

/* eslint-disable @typescript-eslint/no-require-imports -- plain-Node runner, no bundler/TS imports */
const fs = require('fs');
const path = require('path');

function loadEnvFiles() {
  try {
    const dotenv = require('dotenv');
    for (const file of ['.env.local', '.env']) {
      const full = path.join(process.cwd(), file);
      if (fs.existsSync(full)) dotenv.config({ path: full });
    }
  } catch {
    // dotenv is optional; env may already be exported.
  }
}
loadEnvFiles();

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const TRACKING_SCHEMA = 'supabase_migrations';
const TRACKING_TABLE = `${TRACKING_SCHEMA}.schema_migrations`;

function usage(exitCode = 0) {
  console.log(`Usage: node supabase/migrate.js [--dry-run] [--check] [--help]

  Applies pending files in supabase/migrations/ in lexical order.
  Requires DATABASE_URL (direct Postgres connection string).`);
  process.exit(exitCode);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has('--help') || args.has('-h')) usage(0);
  const dryRun = args.has('--dry-run');
  const checkOnly = args.has('--check');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ Missing DATABASE_URL.');
    console.error('   Set it to your Postgres connection string, e.g.:');
    console.error('     DATABASE_URL=postgresql://postgres:password@db.<ref>.supabase.co:5432/postgres');
    console.error('   For local dev, point it at your ephemeral Postgres or `supabase db start`.');
    console.error('   (.env.example documents all required variables.)');
    process.exit(1);
  }

  const { Client } = require('pg');
  const client = new Client({
    connectionString: databaseUrl,
    // Supabase pooler / managed instances require TLS; local ephemeral does not.
    ssl: /localhost|127\.0\.0\.1/.test(databaseUrl) ? false : { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    // Tracking table lives outside `public` so app RLS never interferes.
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${TRACKING_SCHEMA}`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${TRACKING_TABLE} (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const { rows: appliedRows } = await client.query(`SELECT version FROM ${TRACKING_TABLE}`);
    const applied = new Set(appliedRows.map((r) => r.version));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    const pending = files.filter((f) => !applied.has(f));

    console.log(`🚀 PromptPerfect migrations — ${applied.size} applied, ${pending.length} pending.\n`);

    if (pending.length === 0) {
      console.log('✅ Database is up to date. Nothing to do.');
      return;
    }

    if (checkOnly) {
      console.log('⏳ Pending migrations:');
      for (const f of pending) console.log(`   - ${f}`);
      process.exitCode = 1;
      return;
    }

    if (dryRun) {
      console.log('🔍 Dry run — would apply, in order:');
      for (const f of pending) console.log(`   - ${f}`);
      return;
    }

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      if (!sql.trim() || sql.trim().startsWith('-- empty')) {
        console.log(`⏭️  Skipping empty ${file}`);
      } else {
        console.log(`📋 Applying ${file} ...`);
        // One transaction per file (atomic). pg supports multi-statement
        // strings; a failure rolls back the whole file, which stays pending.
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query(`INSERT INTO ${TRACKING_TABLE} (version) VALUES ($1)`, [file]);
          await client.query('COMMIT');
          console.log(`✅ ${file} applied.`);
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`❌ ${file} failed — rolled back. Fix the file and re-run.`);
          throw err;
        }
      }
    }

    console.log('\n🎉 All migrations applied. Database is up to date.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err && err.message ? `Migration error: ${err.message}` : err);
  process.exit(1);
});
