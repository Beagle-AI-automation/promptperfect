import { NextResponse } from 'next/server';
import pg from 'pg';

const SQL = `
CREATE TABLE IF NOT EXISTS public.optimization_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  mode text NOT NULL,
  version text NOT NULL,
  provider text NOT NULL DEFAULT 'google',
  model text NOT NULL DEFAULT '',
  prompt_length integer NOT NULL DEFAULT 0,
  optimized_length integer NOT NULL DEFAULT 0,
  explanation_length integer NOT NULL DEFAULT 0,
  rating text,
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_optimization_logs_session_id ON public.optimization_logs (session_id);

ALTER TABLE public.optimization_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon insert" ON public.optimization_logs;
DROP POLICY IF EXISTS "Allow anon update" ON public.optimization_logs;

CREATE POLICY "Allow anon insert" ON public.optimization_logs
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update" ON public.optimization_logs
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Ensure feedback column exists (for tables created before this was added)
ALTER TABLE public.optimization_logs ADD COLUMN IF NOT EXISTS feedback text;
`;

export async function POST() {
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json(
      {
        error:
          'Add SUPABASE_DB_URL to .env. Get it from: Supabase Dashboard → Project Settings → Database → Connection string (URI)',
      },
      { status: 500 },
    );
  }

  const client = new pg.Client({ connectionString: dbUrl });
  try {
    await client.connect();
    await client.query(SQL);
    await client.end();
    return NextResponse.json({ success: true, message: 'optimization_logs table created' });
  } catch (err) {
    await client.end().catch(() => {});
    console.error('[setup-db]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create table' },
      { status: 500 },
    );
  }
}
