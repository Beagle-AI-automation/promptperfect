import { validatePassword, validateEmail } from '@/lib/auth/validation'
import { checkRateLimit } from '@/lib/auth/rateLimit'
import { getEmailConfirmationRedirectUrl } from '@/lib/auth/oauthRedirect'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import {
  getSupabaseUrl,
  normalizeEnvValue,
} from '@/lib/client/supabase'

function getServiceSupabase() {
  const url = getSupabaseUrl()
  const key =
    normalizeEnvValue(process.env.SUPABASE_SERVICE_KEY) ||
    normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY)
  if (!url || !key) return null
  return createClient(url, key)
}

function looksLikeDuplicateAuthError(message: string): boolean {
  return /already\s*registered|already\s*exists|user\s*already|duplicate|unique/i.test(
    message,
  )
}

function clarifySignupError(message: string): string {
  if (message.includes('Database error creating new user')) {
    return (
      'Could not create your account (auth database error). ' +
      'If this keeps happening, open Supabase Dashboard → Database and check for triggers ' +
      'on auth.users that insert into public tables; fix or remove the broken trigger.'
    )
  }
  return message
}

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait a minute.' },
      { status: 429 },
    )
  }

  const body = await request.json()
  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''

  if (!validateEmail(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }
  const validation = validatePassword(password)
  if (!validation.isValid) {
    return NextResponse.json({ error: validation.errors[0] }, { status: 400 })
  }

  const supabase = getServiceSupabase()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!supabase || !url || !anonKey) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { data: existingRow } = await supabase
    .from('pp_users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingRow) {
    return NextResponse.json(
      {
        error:
          'An account with this email already exists. Try signing in instead.',
      },
      { status: 409 },
    )
  }

  let uid: string | undefined
  let authUser:
    | { id: string; email?: string | null }
    | undefined

  const adminResult = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: name || undefined,
      full_name: name || undefined,
    },
  })

  if (!adminResult.error && adminResult.data.user) {
    uid = adminResult.data.user.id
    authUser = adminResult.data.user
  } else {
    const adminMsg = adminResult.error?.message ?? ''
    if (looksLikeDuplicateAuthError(adminMsg)) {
      return NextResponse.json(
        {
          error:
            'An account with this email already exists. Try signing in instead.',
        },
        { status: 409 },
      )
    }

    const anon = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const signUpRes = await anon.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || undefined,
          full_name: name || undefined,
        },
      },
    })

    if (signUpRes.error) {
      const sm = signUpRes.error.message ?? ''
      if (looksLikeDuplicateAuthError(sm)) {
        return NextResponse.json(
          {
            error:
              'An account with this email already exists. Try signing in instead.',
          },
          { status: 409 },
        )
      }
      const primary = clarifySignupError(adminMsg || sm)
      return NextResponse.json(
        { error: primary || sm || 'Sign up failed' },
        { status: 400 },
      )
    }

    if (!signUpRes.data.user) {
      return NextResponse.json({ error: 'Sign up failed' }, { status: 500 })
    }

    uid = signUpRes.data.user.id
    authUser = signUpRes.data.user

    const { error: confirmErr } = await supabase.auth.admin.updateUserById(uid, {
      email_confirm: true,
    })
    if (confirmErr) {
      console.error('[signup] updateUserById after signUp:', confirmErr.message)
    }
  }

  if (!uid) {
    return NextResponse.json({ error: 'Sign up failed' }, { status: 500 })
  }

  const { error: insertErr } = await supabase.from('pp_users').insert({
    id: uid,
    name: name || null,
    email,
    password_hash: 'supabase_auth',
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    api_key: '',
  })
  if (insertErr && insertErr.code !== '23505') {
    return NextResponse.json(
      { error: insertErr.message || 'Could not create profile' },
      { status: 500 },
    )
  }

  /** Profile display_name comes from auth trigger (globally unique). Do not overwrite with plain signup name — avoids collisions. */

  const { data: profile } = await supabase
    .from('pp_users')
    .select('id, name, email, provider, model')
    .eq('id', uid)
    .maybeSingle()

  const userPayload =
    profile ??
    (authUser
      ? {
          id: authUser.id,
          name: name || null,
          email: authUser.email ?? email,
          provider: 'gemini' as const,
          model: 'gemini-2.0-flash' as const,
        }
      : null)

  if (!userPayload) {
    return NextResponse.json(
      { error: 'Account created but profile could not be loaded' },
      { status: 500 },
    )
  }

  const authClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  let session: { access_token: string; refresh_token: string } | undefined
  const { data: signInData, error: signInErr } =
    await authClient.auth.signInWithPassword({ email, password })
  if (!signInErr && signInData.session) {
    session = {
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
    }
  } else if (signInErr) {
    console.error('[signup] signInWithPassword after signup:', signInErr.message)
  }

  return NextResponse.json({
    user: userPayload,
    ...(session ? { session } : {}),
  })
}
