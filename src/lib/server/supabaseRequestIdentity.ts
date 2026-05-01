import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  getSupabaseAdminClient,
  getSupabaseUrl,
  normalizeEnvValue,
} from '@/lib/client/supabase';
import { createRouteHandlerClient } from '@/lib/server/supabase';

export function getAnonKey(): string | null {
  const k = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return k || null;
}

export async function verifyBearer(request: Request): Promise<{
  userId: string;
  email: string;
  token: string;
} | null> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;

  const url = getSupabaseUrl();
  const anonKey = getAnonKey();
  if (!url || !anonKey) return null;

  const supabase = createClient(url, anonKey);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user?.id) return null;
  return {
    userId: user.id,
    email: user.email ?? '',
    token,
  };
}

/**
 * Resolve the signed-in user for API routes: Supabase cookie session first
 * (`createRouteHandlerClient` + `auth.getUser()`), then `Authorization: Bearer`
 * for clients without cookies (e.g. browser extension).
 */
export async function resolveIdentity(request: Request): Promise<
  | {
      userId: string;
      email: string;
      token?: string;
    }
  | undefined
> {
  try {
    const routeSb = await createRouteHandlerClient();
    const {
      data: { user },
      error,
    } = await routeSb.auth.getUser();

    if (!error && user?.id) {
      const {
        data: { session },
      } = await routeSb.auth.getSession();
      return {
        userId: user.id,
        email: user.email?.trim() ?? '',
        token: session?.access_token,
      };
    }
  } catch {
    // swallow: createRouteHandlerClient/cookies() unavailable outside App Router context
  }

  const jwt = await verifyBearer(request);
  if (jwt) {
    return {
      userId: jwt.userId,
      email: jwt.email?.trim() ?? '',
      token: jwt.token,
    };
  }

  return undefined;
}

export function getDbForIdentity(identity: {
  userId: string;
  token?: string;
}): SupabaseClient | null {
  const admin = getSupabaseAdminClient();
  if (!identity.token) {
    return admin;
  }
  if (admin) return admin;
  const url = getSupabaseUrl();
  const anonKey = getAnonKey();
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${identity.token}` },
    },
  });
}

/** When `resolveIdentity` fails, explain why (for API 401 JSON). */
export async function jsonUnauthorizedDetails(
  request: Request,
): Promise<{ error: string; hint: string; code: string }> {
  const hasBearer = Boolean(
    request.headers.get('authorization')?.startsWith('Bearer '),
  );

  if (hasBearer) {
    return {
      error: 'Unauthorized',
      hint:
        'Bearer token was rejected (expired or invalid), or it does not match this Supabase project. Sign in again.',
      code: 'BEARER_REJECTED',
    };
  }

  return {
    error: 'Unauthorized',
    hint:
      'No valid session. Sign in from this app (cookies) or send a valid Authorization Bearer token.',
    code: 'NO_CREDENTIALS',
  };
}
