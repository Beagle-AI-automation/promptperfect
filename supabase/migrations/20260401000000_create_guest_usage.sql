-- Guest usage tracking for PP-503
-- Stores fingerprint-based optimization counts for unauthenticated users.
-- guest_id is generated client-side via nanoid and persisted in localStorage.
-- PP-504 can JOIN on guest_id to migrate optimizations to a user account on signup.

CREATE TABLE IF NOT EXISTS guest_usage (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id         text        UNIQUE NOT NULL,
  optimization_count integer   DEFAULT 0 NOT NULL,
  last_used_at     timestamptz DEFAULT now(),
  last_mode        text,
  last_provider    text,
  created_at       timestamptz DEFAULT now()
);

-- Index for fast lookups by guest fingerprint
CREATE INDEX IF NOT EXISTS guest_usage_guest_id_idx ON guest_usage (guest_id);

-- RLS: only the service role (used by the API route) can read/write
ALTER TABLE guest_usage ENABLE ROW LEVEL SECURITY;

-- Allow the API route (service role key) full access; deny everyone else
CREATE POLICY "service_role_only" ON guest_usage
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
