-- Enable RLS on pp_optimization_history and add permissive policies
-- so that the anon key (used client-side on Vercel) can insert and read rows.
-- Without these policies, Supabase blocks all access when RLS is enabled,
-- causing saveToHistory() to silently fail and the Share button to never appear.

ALTER TABLE pp_optimization_history ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert new optimization records (sessions are anonymous)
CREATE POLICY IF NOT EXISTS "allow_insert_for_all"
  ON pp_optimization_history
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to read records (needed for history panel and shared link view)
CREATE POLICY IF NOT EXISTS "allow_select_for_all"
  ON pp_optimization_history
  FOR SELECT
  USING (true);

-- Allow updates so share_id can be set when a user clicks Share
CREATE POLICY IF NOT EXISTS "allow_update_for_all"
  ON pp_optimization_history
  FOR UPDATE
  USING (true);
