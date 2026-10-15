-- 20261014000000_tighten_optimization_logs_rls.sql
--
-- Cierra el hueco de escritura anónima en `optimization_logs`.
--
-- Situación: la migración original concede tres políticas `WITH CHECK (true)` /
-- `USING (true)` a `anon`. La de UPDATE es el problema: cualquier visitante
-- sin sesión puede reescribir o vaciar cualquier fila de la tabla (prompts,
-- explicaciones, feedback) con solo adivinar un `session_id`. Es una violación
-- de integridad, no solo de confidencialidad.
--
-- Por qué es seguro quitarlas: todo acceso de la app a esta tabla pasa por el
-- cliente `service_role` (`getServiceClient` / `getSupabaseAdminClient`), que
-- ignora RLS por diseño. Verificado sobre `src/`: /api/optimize, /api/feedback,
-- /api/feedback/status, /api/profile, /api/history y optimizationLogStats usan
-- todos service_role; no hay ni un acceso desde el cliente con la clave anon.
-- La extensión Chrome habla con la API HTTP, nunca con Supabase directamente.
--
-- Patrón expand-and-contract: solo se retiran políticas que la app no usa.
-- Idempotente: `IF EXISTS` en cada DROP, seguro de re-ejecutar.
--
-- Bloqueos: DROP POLICY toma brevemente un lock auto-conflictivo sobre la
-- tabla; no escanea filas y no bloquea lecturas.
--
-- ROLLBACK (si hiciera falta restaurar el comportamiento anterior):
--   CREATE POLICY "Allow anon update" ON public.optimization_logs
--     USING (true) WITH CHECK (true);
--   CREATE POLICY "Allow anon delete" ON public.optimization_logs
--     USING (true);
-- No se restauran por defecto: eso reintroduce el agujero.

-- La escritura anónima amplia sobra: el servidor escribe con service_role.
DROP POLICY IF EXISTS "Allow anon update" ON public.optimization_logs;
DROP POLICY IF EXISTS "Allow anon delete" ON public.optimization_logs;
DROP POLICY IF EXISTS "Allow anon all" ON public.optimization_logs;

-- `Allow anon insert` se conserva: es la vía por la que se registra una
-- optimización anónima, y el caso peor (una fila basura) ya es posible vía
-- API. Se acota lo imprescindible: la fila debe declarar un `session_id` con
-- forma plausible, para no aceptar cualquier cosa.
DROP POLICY IF EXISTS "Allow anon insert" ON public.optimization_logs;
CREATE POLICY "Allow anon insert" ON public.optimization_logs
  FOR INSERT
  WITH CHECK (
    session_id IS NOT NULL
    AND length(session_id) BETWEEN 1 AND 200
  );
