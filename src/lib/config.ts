/**
 * Centralized environment configuration.
 *
 * NOTE on validation style: Zod is the usual pick, but it is not a direct
 * dependency and `npm install` is currently broken upstream (the `ai@6`
 * tree pins a `@ai-sdk/provider-utils` version missing from the registry),
 * so adding it would break `npm ci` reproducibility. These hand-rolled,
 * fully-typed validators cover the same ground with zero new dependencies.
 *
 * Design: never throw for missing optional backends (local mode legitimately
 * runs without Supabase). `configIssues()` returns human-readable warnings
 * for logs and health checks instead.
 */

import { normalizeSupabaseUrl } from '@/lib/env';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string | null;
}

export interface AiKeys {
  gemini: string | null;
  openai: string | null;
  anthropic: string | null;
}

export interface AppFlags {
  unlimitedMode: boolean;
  guestTokenLimit: number;
  siteUrl: string | null;
  allowedOrigins: string[];
}

export interface AppConfig {
  supabase: SupabaseConfig | null;
  aiKeys: AiKeys;
  geminiModel: string;
  openaiModel: string;
  openaiReasoningEffort: string;
  flags: AppFlags;
}

function nonempty(v: string | undefined): string | null {
  const t = v?.trim();
  return t ? t : null;
}

function flagOn(v: string | undefined): boolean {
  return v != null && ['true', '1', 'yes'].includes(v.trim().toLowerCase());
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw == null || raw.trim() === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

let cached: AppConfig | null = null;

/** Lazily validated, memoized app config (safe on server and client). */
export function getConfig(): AppConfig {
  if (cached) return cached;

  const url =
    normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) ??
    normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const anonKey = nonempty(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceRoleKey =
    nonempty(process.env.SUPABASE_SERVICE_ROLE_KEY) ??
    nonempty(process.env.SUPABASE_SERVICE_KEY);

  const rawOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);

  cached = {
    supabase:
      url && anonKey ? { url, anonKey, serviceRoleKey } : null,
    aiKeys: {
      gemini:
        nonempty(process.env.PROMPTPERFECT_GOOGLE_API_KEY) ??
        nonempty(process.env.GOOGLE_GENERATIVE_AI_API_KEY) ??
        nonempty(process.env.GEMINI_API_KEY) ??
        nonempty(process.env.GOOGLE_API_KEY),
      openai:
        nonempty(process.env.PROMPTPERFECT_OPENAI_API_KEY) ??
        nonempty(process.env.OPENAI_API_KEY),
      anthropic:
        nonempty(process.env.PROMPTPERFECT_ANTHROPIC_API_KEY) ??
        nonempty(process.env.ANTHROPIC_API_KEY),
    },
    geminiModel: nonempty(process.env.GEMINI_MODEL) ?? 'gemini-3.5-flash',
    openaiModel: nonempty(process.env.OPENAI_MODEL) ?? 'gpt-6-astra',
    openaiReasoningEffort:
      nonempty(process.env.OPENAI_REASONING_EFFORT) ?? 'high',
    flags: {
      unlimitedMode:
        flagOn(process.env.NEXT_PUBLIC_UNLIMITED_MODE) ||
        flagOn(process.env.UNLIMITED_MODE),
      guestTokenLimit: parsePositiveInt(
        process.env.NEXT_PUBLIC_GUEST_TOKEN_LIMIT,
        5,
      ),
      siteUrl: nonempty(process.env.NEXT_PUBLIC_SITE_URL),
      allowedOrigins: rawOrigins,
    },
  };
  return cached;
}

/** Test seam: drop the memoized config so env changes take effect. */
export function resetConfigCache(): void {
  cached = null;
}

/**
 * Human-readable configuration warnings (missing backends/keys). Empty when
 * everything needed for the current mode is present. Intended for startup
 * logs and health endpoints — not exceptions, since local mode is valid.
 */
export function configIssues(): string[] {
  const c = getConfig();
  const issues: string[] = [];
  if (!c.supabase) {
    issues.push(
      'Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY). ' +
        'Auth, cloud history, library sync, and share links are disabled; local fallbacks apply.',
    );
  } else if (!c.supabase.serviceRoleKey) {
    issues.push(
      'SUPABASE_SERVICE_ROLE_KEY is missing: server-side writes (migrations, admin ops) are disabled.',
    );
  }
  if (!c.aiKeys.gemini && !c.aiKeys.openai && !c.aiKeys.anthropic) {
    issues.push(
      'No LLM provider key is set (GOOGLE_GENERATIVE_AI_API_KEY / OPENAI_API_KEY / ANTHROPIC_API_KEY). Optimization calls will fail.',
    );
  }
  if (!c.flags.siteUrl) {
    issues.push(
      'NEXT_PUBLIC_SITE_URL is missing: OAuth and email redirects fall back to request origin.',
    );
  }
  return issues;
}
