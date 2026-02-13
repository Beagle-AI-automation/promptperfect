import type { Mode, OptimizeVersion } from '@/lib/types';
import { getSupabaseClient } from './supabase';

export interface OptimizationLogInsert {
  mode: Mode;
  version: OptimizeVersion;
  provider: 'google';
  model: string;
  prompt_length: number;
  optimized_length: number;
  explanation_length: number;
}

export async function logOptimization(insert: OptimizationLogInsert) {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  // Requires an `optimization_logs` table with INSERT allowed via RLS for anon.
  await supabase.from('optimization_logs').insert(insert);
}

