import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/client/supabase';
import {
  isUniqueViolation,
  mapProfileUniqueViolation,
} from '@/lib/server/profileConstraintErrors';
import { computeOptimizationFeedbackAnalytics } from '@/lib/server/optimizationLogStats';
import {
  getDbForIdentity,
  jsonUnauthorizedDetails,
  resolveIdentity,
  wantsPpUserAuth,
} from '@/lib/server/supabaseRequestIdentity';

type ProfileRow = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

function emailLocalPart(email: string): string {
  return email.split('@')[0]?.trim() ?? '';
}

/** Use signup name when the profile row still has the trigger default (email local part). */
function resolveDisplayNameWithSignup(
  email: string,
  profileDisplay: string | null,
  signupName: string | null,
): string | null {
  const d = profileDisplay?.trim() ?? '';
  const s = signupName?.trim() ?? '';
  if (s && (!d || d === emailLocalPart(email))) return s;
  return d || s || null;
}

function computeStats(
  rows: { mode: string | null; provider: string | null }[] | null,
): {
  total: number;
  favoriteMode: string | null;
  favoriteProvider: string | null;
  thumbsUp: number;
  thumbsDown: number;
} {
  if (!rows?.length) {
    return {
      total: 0,
      favoriteMode: null,
      favoriteProvider: null,
      thumbsUp: 0,
      thumbsDown: 0,
    };
  }
  const modeCounts: Record<string, number> = {};
  const providerCounts: Record<string, number> = {};
  for (const opt of rows) {
    const m = typeof opt.mode === 'string' ? opt.mode : '';
    if (m) modeCounts[m] = (modeCounts[m] || 0) + 1;
    const p = typeof opt.provider === 'string' ? opt.provider : '';
    if (p) providerCounts[p] = (providerCounts[p] || 0) + 1;
  }
  const favoriteMode =
    Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const favoriteProvider =
    Object.entries(providerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    null;
  return {
    total: rows.length,
    favoriteMode,
    favoriteProvider,
    thumbsUp: 0,
    thumbsDown: 0,
  };
}

export async function GET(request: Request) {
  if (wantsPpUserAuth(request) && !getSupabaseAdminClient()) {
    return NextResponse.json(
      {
        error: 'Profile API needs the service role key.',
        hint: 'Add SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY to .env (same project as NEXT_PUBLIC_SUPABASE_URL). Restart the dev server.',
        code: 'SERVICE_KEY_REQUIRED',
      },
      { status: 503 },
    );
  }

  const identity = await resolveIdentity(request);
  if (!identity) {
    return NextResponse.json(await jsonUnauthorizedDetails(request), {
      status: 401,
    });
  }

  const adminForConfirm = getSupabaseAdminClient();
  if (adminForConfirm) {
    const { data: gotrue, error: guErr } =
      await adminForConfirm.auth.admin.getUserById(identity.userId);
    if (!guErr && gotrue?.user && !gotrue.user.email_confirmed_at) {
      return NextResponse.json(
        {
          error:
            'Please confirm your email before using PromptPerfect. Check your inbox for the confirmation link.',
          code: 'EMAIL_NOT_CONFIRMED',
        },
        { status: 403 },
      );
    }
  }

  const db = getDbForIdentity(identity);
  if (!db) {
    return NextResponse.json(
      {
        error: 'Server misconfigured',
        hint: 'Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY in .env so profiles work with app login (pp_user) and for reliable database access.',
      },
      { status: 503 },
    );
  }

  const admin = getSupabaseAdminClient();
  const userId = identity.userId;

  let profileRow: ProfileRow | null = null;

  const { data: existing, error: selErr } = await db
    .from('pp_user_profiles')
    .select('id, email, display_name, avatar_url, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (selErr) {
    const msg = selErr.message || '';
    const missing =
      /does not exist|could not find|schema cache|42P01/i.test(msg);
    return NextResponse.json(
      {
        error: missing
          ? 'Database table pp_user_profiles is missing.'
          : selErr.message,
        hint: missing
          ? 'Run supabase/migrations/20250405000000_pp_user_profiles.sql in the Supabase SQL editor.'
          : undefined,
        code: 'PROFILE_DB_ERROR',
      },
      { status: missing ? 503 : 500 },
    );
  }

  if (existing) {
    profileRow = existing as ProfileRow;
  } else {
    let displayName =
      (identity.email?.split('@')[0] || 'User').trim() || 'User';
    let email = identity.email ?? '';

    if (admin) {
      const { data: pu } = await admin
        .from('pp_users')
        .select('name, email')
        .eq('id', userId)
        .maybeSingle();
      if (pu) {
        if (typeof pu.email === 'string' && pu.email) email = pu.email;
        if (typeof pu.name === 'string' && pu.name?.trim()) {
          displayName = pu.name.trim();
        }
      }
    }

    if (admin) {
      const { data: authRow, error: authLookupErr } =
        await admin.auth.admin.getUserById(userId);
      if (authLookupErr || !authRow.user) {
        return NextResponse.json(
          {
            error:
              'This user id is not a valid Supabase Auth account. Log out, then log in again.',
            hint: 'Your browser may still have an old account id from before Auth was linked. Logging in again refreshes it.',
            code: 'AUTH_ID_NOT_FOUND',
          },
          { status: 400 },
        );
      }
    }

    const { data: inserted, error: insErr } = await db
      .from('pp_user_profiles')
      .insert({
        id: userId,
        email,
        display_name: displayName,
        avatar_url: null,
      })
      .select('id, email, display_name, avatar_url, created_at')
      .maybeSingle();

    if (insErr) {
      const fk = /pp_user_profiles_id_fkey|foreign key/i.test(insErr.message);
      return NextResponse.json(
        {
          error: insErr.message,
          hint: fk
            ? 'Your account id must match Supabase Auth. Log out, log in again, then open Profile.'
            : 'Ensure migration ran and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY is set.',
          code: fk ? 'PROFILE_FK_AUTH' : 'PROFILE_INSERT_FAILED',
        },
        { status: fk ? 400 : 500 },
      );
    }
    profileRow = inserted as ProfileRow;
  }

  if (!profileRow) {
    return NextResponse.json(
      { error: 'Could not load profile' },
      { status: 500 },
    );
  }

  let signupName: string | null = null;
  if (admin) {
    const { data: pu } = await admin
      .from('pp_users')
      .select('name')
      .eq('id', userId)
      .maybeSingle();
    if (typeof pu?.name === 'string' && pu.name.trim()) {
      signupName = pu.name.trim();
    }
  }

  const prevDisplay = profileRow.display_name;
  const resolvedDisplay = resolveDisplayNameWithSignup(
    profileRow.email,
    profileRow.display_name,
    signupName,
  );
  if (resolvedDisplay !== prevDisplay && resolvedDisplay != null) {
    await db
      .from('pp_user_profiles')
      .update({
        display_name: resolvedDisplay,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  }
  profileRow = { ...profileRow, display_name: resolvedDisplay };

  let optCount: number | null = null;
  let optRows: { mode: string | null; provider: string | null }[] | null =
    null;
  const { count, error: cntErr } = await db
    .from('pp_optimization_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (!cntErr) optCount = count;
  const { data: rows, error: rowsErr } = await db
    .from('pp_optimization_history')
    .select('mode, provider')
    .eq('user_id', userId);
  if (!rowsErr) optRows = rows;

  const baseStats = computeStats(optRows);
  let thumbsUp = baseStats.thumbsUp;
  let thumbsDown = baseStats.thumbsDown;
  if (admin) {
    const fb = await computeOptimizationFeedbackAnalytics(admin, userId);
    thumbsUp = fb.thumbsUp;
    thumbsDown = fb.thumbsDown;
  }

  const stats = { ...baseStats, thumbsUp, thumbsDown };

  return NextResponse.json({
    profile: {
      id: profileRow.id,
      email: profileRow.email,
      display_name: profileRow.display_name,
      avatar_url: profileRow.avatar_url,
      created_at: profileRow.created_at,
      optimization_count: optCount ?? stats.total,
    },
    stats,
  });
}

export async function PATCH(request: Request) {
  if (wantsPpUserAuth(request) && !getSupabaseAdminClient()) {
    return NextResponse.json(
      {
        error: 'Profile API needs the service role key.',
        hint: 'Add SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY to .env and restart the dev server.',
        code: 'SERVICE_KEY_REQUIRED',
      },
      { status: 503 },
    );
  }

  const identity = await resolveIdentity(request);
  if (!identity) {
    return NextResponse.json(await jsonUnauthorizedDetails(request), {
      status: 401,
    });
  }

  const adminGate = getSupabaseAdminClient();
  if (adminGate) {
    const { data: gotrue, error: guErr } =
      await adminGate.auth.admin.getUserById(identity.userId);
    if (!guErr && gotrue?.user && !gotrue.user.email_confirmed_at) {
      return NextResponse.json(
        {
          error:
            'Please confirm your email before editing your profile. Check your inbox for the confirmation link.',
          code: 'EMAIL_NOT_CONFIRMED',
        },
        { status: 403 },
      );
    }
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const display_name =
    typeof body?.display_name === 'string' ? body.display_name.trim() : undefined;
  const avatar_url =
    body?.avatar_url === null
      ? null
      : typeof body?.avatar_url === 'string'
        ? body.avatar_url.trim() || null
        : undefined;

  if (display_name === undefined && avatar_url === undefined) {
    return NextResponse.json(
      { error: 'No updates provided' },
      { status: 400 },
    );
  }

  const db = getDbForIdentity(identity);
  if (!db) {
    return NextResponse.json(
      {
        error: 'Server misconfigured',
        hint: 'Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY to save profile when using app login without a Supabase cookie session.',
      },
      { status: 503 },
    );
  }

  const admin = getSupabaseAdminClient();

  const { data: current, error: selErr } = await db
    .from('pp_user_profiles')
    .select('id, email, display_name, avatar_url, created_at')
    .eq('id', identity.userId)
    .maybeSingle();

  if (selErr) {
    return NextResponse.json({ error: selErr.message }, { status: 500 });
  }

  /** Accounts registered before `pp_user_profiles` / `handle_new_user` may have no row; UPDATE alone returned 0 rows. */
  let email =
    (current?.email && current.email.trim()) ||
    identity.email?.trim() ||
    '';
  if (!email && admin) {
    const { data: pu } = await admin
      .from('pp_users')
      .select('email')
      .eq('id', identity.userId)
      .maybeSingle();
    if (typeof pu?.email === 'string' && pu.email.trim()) {
      email = pu.email.trim().toLowerCase();
    }
  }
  if (!email && admin) {
    const { data: authRow } = await admin.auth.admin.getUserById(identity.userId);
    const em = authRow?.user?.email?.trim();
    if (em) email = em.toLowerCase();
  }
  if (!email) {
    return NextResponse.json(
      {
        error:
          'Cannot save profile: no email found for this account. Sign out and sign in again.',
        code: 'PROFILE_NO_EMAIL',
      },
      { status: 400 },
    );
  }

  const nextDisplay =
    display_name !== undefined
      ? display_name === ''
        ? null
        : display_name
      : (current?.display_name ?? null);
  const nextAvatar =
    avatar_url !== undefined
      ? avatar_url === ''
        ? null
        : avatar_url
      : (current?.avatar_url ?? null);

  const updatedAt = new Date().toISOString();
  const row = {
    id: identity.userId,
    email,
    display_name: nextDisplay,
    avatar_url: nextAvatar,
    updated_at: updatedAt,
  };

  const { data: updated, error } = await db
    .from('pp_user_profiles')
    .upsert(row, { onConflict: 'id' })
    .select('id, email, display_name, avatar_url, created_at')
    .maybeSingle();

  if (error) {
    if (isUniqueViolation(error.message)) {
      return NextResponse.json(
        {
          error: mapProfileUniqueViolation(error.message),
          code: 'PROFILE_UNIQUE_VIOLATION',
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json(
      { error: 'Could not save profile. Try again or reload the page.' },
      { status: 500 },
    );
  }

  if (display_name !== undefined) {
    await db
      .from('pp_users')
      .update({ name: nextDisplay || null })
      .eq('id', identity.userId);
  }

  const { count: optCount } = await db
    .from('pp_optimization_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', identity.userId);

  return NextResponse.json({
    profile: {
      id: updated.id,
      email: updated.email,
      display_name: updated.display_name,
      avatar_url: updated.avatar_url,
      created_at: updated.created_at,
      optimization_count: optCount ?? 0,
    },
  });
}
