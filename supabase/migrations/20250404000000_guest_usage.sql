-- Guest prompt optimizations (fingerprint + counts) for free tier before signup.
-- Accessed only via service role from /api/guest-usage (RLS blocks anon).

CREATE TABLE IF NOT EXISTS guest_usage (
  guest_id text PRIMARY KEY,
  optimization_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  last_mode text,
  last_provider text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guest_usage_last_used
  ON guest_usage (last_used_at DESC);

ALTER TABLE guest_usage ENABLE ROW LEVEL SECURITY;
