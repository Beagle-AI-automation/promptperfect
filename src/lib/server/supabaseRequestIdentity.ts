import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  getSupabaseAdminClient,
  getSupabaseUrl,
  normalizeEnvValue,
} from '@/lib/client/supabase';

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

export async function verifyPpUserHeaders(
  request: Request,
): Promise<{ userId: string; email: string } | null> {
  const id = request.headers.get('x-pp-user-id')?.trim();
  const email = request.headers.get('x-pp-user-email')?.trim();
  if (!id || !email || !/^[\da-f-]{36}$/i.test(id)) return null;

  const admin = getSupabaseAdminClient();
  if (!admin) return null;

  const want = email.toLowerCase();
  const { data: authData, error: authErr } =
    await admin.auth.admin.getUserById(id);
  if (authErr || !authData.user) return null;
  const authEmail = authData.user.email?.trim();
  if (!authEmail) return null;
  if (authEmail.toLowerCase() !== want) return null;
  return { userId: id, email: authEmail };
}

export async function resolveIdentity(request: Request): Promise<
  | {
      userId: string;
      email: string;
      token?: string;
    }
  | undefined
> {
  const jwt = await verifyBearer(request);
  const pp = await verifyPpUserHeaders(request);

  // Both are sent from the app (see getPromptPerfectAuthHeaders). If they disagree,
  // preferring only the JWT made the API use another user's id while the UI still
  // showed pp_user — leaking library/history/stats across accounts.
  if (jwt && pp) {
    if (jwt.userId.toLowerCase() !== pp.userId.toLowerCase()) {
      return undefined;
    }
    const emJ = jwt.email?.trim().toLowerCase() ?? '';
    const emP = pp.email?.trim().toLowerCase() ?? '';
    if (emJ && emP && emJ !== emP) {
      return undefined;
    }
    return {
      userId: jwt.userId,
      email: jwt.email?.trim() || pp.email,
      token: jwt.token,
    };
  }

  if (jwt) return jwt;
  if (pp) return { userId: pp.userId, email: pp.email };
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

export function wantsPpUserAuth(request: Request): boolean {
  return Boolean(
    request.headers.get('x-pp-user-id')?.trim() &&
      request.headers.get('x-pp-user-email')?.trim(),
  );
}

/** When `resolveIdentity` fails, explain why (for API 401 JSON). */
export async function jsonUnauthorizedDetails(
  request: Request,
): Promise<{ error: string; hint: string; code: string }> {
  const hasPP = wantsPpUserAuth(request);
  const hasBearer = request.headers.get('authorization')?.startsWith('Bearer ');

  if (hasPP && hasBearer) {
    const jwt = await verifyBearer(request);
    const pp = await verifyPpUserHeaders(request);
    if (jwt && pp) {
      const idOk = jwt.userId.toLowerCase() === pp.userId.toLowerCase();
      const emJ = jwt.email?.trim().toLowerCase() ?? '';
      const emP = pp.email?.trim().toLowerCase() ?? '';
      const emailOk = !emJ || !emP || emJ === emP;
      if (!idOk || !emailOk) {
        return {
          error: 'Unauthorized',
          hint:
            'Your Supabase session does not match this app’s saved login. Use Log out, then sign in again so session and library use the same account.',
          code: 'AUTH_SESSION_MISMATCH',
        };
      }
    }
  }

  if (!hasPP && !hasBearer) {
    return {
      error: 'Unauthorized',
      hint: 'No session was sent. Sign in from this app, then retry.',
      code: 'NO_CREDENTIALS',
    };
  }

  if (hasPP) {
    const id = request.headers.get('x-pp-user-id')?.trim() ?? '';
    const email = request.headers.get('x-pp-user-email')?.trim() ?? '';
    if (!/^[\da-f-]{36}$/i.test(id)) {
      return {
        error: 'Unauthorized',
        hint: 'Saved login data has an invalid user id. Log out, then log in again.',
        code: 'PP_INVALID_ID',
      };
    }
    const admin = getSupabaseAdminClient();
    if (!admin) {
      return {
        error: 'Unauthorized',
        hint: 'Server cannot verify your account: set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY in .env for the same Supabase project as NEXT_PUBLIC_SUPABASE_URL, then restart `npm run dev`.',
        code: 'SERVICE_KEY_MISSING',
      };
    }
    const { data, error } = await admin.auth.admin.getUserById(id);
    if (error) {
      const notFound = /user not found|not found/i.test(error.message);
      return {
        error: 'Unauthorized',
        hint: notFound
          ? 'The saved account id is not in this Supabase project. Reload the app or log out and log in so your browser picks up the correct Auth user id (or fix NEXT_PUBLIC_SUPABASE_URL / keys if they point at the wrong project).'
          : `Supabase Auth lookup failed (${error.message}). Confirm the service role key and URL are from the same project.`,
        code: 'AUTH_ADMIN_LOOKUP_FAILED',
      };
    }
    if (!data.user) {
      return {
        error: 'Unauthorized',
        hint: 'Your saved account id is not in Supabase Auth. Log out, then sign in again.',
        code: 'PP_USER_NOT_FOUND',
      };
    }
    if (!data.user.email?.trim()) {
      return {
        error: 'Unauthorized',
        hint: 'Your Supabase user has no email. Use email/password or an OAuth provider that supplies email.',
        code: 'PP_AUTH_NO_EMAIL',
      };
    }
    if (data.user.email.toLowerCase() !== email.toLowerCase()) {
      return {
        error: 'Unauthorized',
        hint: 'Email in saved login does not match your Supabase account. Log out, then log in again.',
        code: 'PP_EMAIL_MISMATCH',
      };
    }
    return {
      error: 'Unauthorized',
      hint: 'Auth headers look valid but verification failed. Hard refresh the page or log out and log in again.',
      code: 'AUTH_UNEXPECTED',
    };
  }

  if (hasBearer) {
    return {
      error: 'Unauthorized',
      hint: 'Session token was rejected (expired or anon key / URL from a different Supabase project than the token). Log out, then log in again.',
      code: 'BEARER_REJECTED',
    };
  }

  return {
    error: 'Unauthorized',
    hint: 'Sign in again from this app.',
    code: 'UNKNOWN',
  };
}
