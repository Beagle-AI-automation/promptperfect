import type { SupabaseClient } from '@supabase/supabase-js';
import { getOAuthCallbackUrl } from '@/lib/auth/oauthRedirect';

/** Google OAuth entry point for login / signup shells (matches Supabase redirect allowlist → `/auth/callback`). */
export async function signInWithGoogle(client: SupabaseClient) {
  return client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: getOAuthCallbackUrl() },
  });
}
