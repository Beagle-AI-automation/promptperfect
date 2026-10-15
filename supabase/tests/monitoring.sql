-- supabase/tests/monitoring.sql
--
-- Observability toolkit: copy any section into the Supabase SQL Editor or
-- `psql` for production diagnostics. All queries are read-only.
--
--   1. Slow queries (requires pg_stat_statements on Supabase: enabled by default)
--   2. Transaction deadlocks / lock waits
--   3. Connection pool saturation
--   4. Table bloat / row counts for the core tables
--   5. RLS policy inventory (audit tenant isolation at a glance)

-- 1. Top 20 slowest queries by mean execution time -----------------------
-- SELECT query, calls, mean_exec_time AS mean_ms, max_exec_time AS max_ms
-- FROM pg_stat_statements
-- ORDER BY mean_exec_time DESC
-- LIMIT 20;

-- 1b. Slowest PromptPerfect-table queries only -----------------------------
-- SELECT query, calls, mean_exec_time AS mean_ms
-- FROM pg_stat_statements
-- WHERE query LIKE '%optimization_logs%'
--    OR query LIKE '%pp_optimization_history%'
--    OR query LIKE '%pp_saved_prompts%'
--    OR query LIKE '%guest_usage%'
-- ORDER BY mean_exec_time DESC
-- LIMIT 20;

-- 2. Current lock waits / blocked sessions ---------------------------------
SELECT
  blocked.pid AS blocked_pid,
  blocking.pid AS blocking_pid,
  blocked.query AS blocked_query,
  blocking.query AS blocking_query,
  blocked.wait_event_type,
  blocked.wait_event
FROM pg_stat_activity AS blocked
JOIN pg_stat_activity AS blocking
  ON blocking.pid = ANY (pg_blocking_pids(blocked.pid))
WHERE blocked.wait_event_type = 'Lock';

-- 2b. Deadlock counter (rising value between samples = deadlocks happening) -
SELECT datname, deadlocks, conflicts FROM pg_stat_database WHERE datname = current_database();

-- 3. Connection pool saturation ---------------------------------------------
SELECT
  count(*) AS total_connections,
  count(*) FILTER (WHERE state = 'active') AS active,
  count(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_transaction,
  count(*) FILTER (WHERE wait_event_type = 'Lock') AS waiting_on_lock
FROM pg_stat_activity
WHERE datname = current_database();

-- 3b. Per-application connection breakdown ------------------------------------
-- SELECT application_name, state, count(*)
-- FROM pg_stat_activity
-- WHERE datname = current_database()
-- GROUP BY application_name, state
-- ORDER BY count(*) DESC;

-- 4. Core-table row counts + sizes --------------------------------------------
SELECT
  relname AS table_name,
  n_live_tup AS live_rows,
  pg_size_pretty(pg_total_relation_size(oid)) AS total_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND relname IN (
    'optimization_logs', 'pp_optimization_history', 'pp_saved_prompts',
    'pp_user_profiles', 'guest_usage', 'pp_users', 'pp_guest_sessions'
  )
ORDER BY pg_total_relation_size(oid) DESC;

-- 5. RLS policy inventory (every table must appear with ≥1 policy) ------------
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 5b. Tables with RLS DISABLED (must return zero rows in production) ---------
SELECT relname AS rls_disabled_table
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'optimization_logs', 'pp_optimization_history', 'pp_saved_prompts',
    'pp_user_profiles', 'guest_usage'
  )
  AND NOT c.relrowsecurity;
