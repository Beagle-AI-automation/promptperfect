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

  const url = getSupabaseUrl()
  const anonKey = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  /** Required so confirmation emails redirect to `/auth/callback` (must be allowlisted). */
  const emailRedirectTo = getEmailConfirmationRedirectUrl(request)

  const anon = createClient(url, anonKey)
  const { data: signUpData, error: signUpErr } = await anon.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      ...(name ? { data: { full_name: name, name } } : {}),
    },
  })

  if (signUpErr) {
    const msg = signUpErr.message || 'Sign up failed'
    const dbNewUser = /database error creating new user/i.test(msg)
    return NextResponse.json(
      {
        error: msg,
        ...(dbNewUser && {
          hint:
            'Your Supabase auth trigger could not insert into pp_user_profiles (usually RLS). In Supabase → SQL Editor, run section 5 of supabase/run-all.sql, or migrations 20250407100000_fix_handle_new_user_rls.sql and 20250408100000_handle_new_user_owner.sql from this repo.',
        }),
      },
      { status: 400 },
    )
  }

  const uid = signUpData.user?.id
  if (!uid) {
    return NextResponse.json({ error: 'Sign up failed' }, { status: 400 })
  }

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
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

  if (name) {
    await supabase
      .from('pp_user_profiles')
      .update({ display_name: name })
      .eq('id', uid)
  }

  const { data: profile } = await supabase
    .from('pp_users')
    .select('id, name, email, provider, model')
    .eq('id', uid)
    .maybeSingle()

  const userPayload = profile ?? {
    id: uid,
    name: name || null,
    email,
    provider: 'gemini',
    model: 'gemini-2.0-flash',
  }

  if (signUpData.session) {
    return NextResponse.json({
      verificationRequired: false,
      email,
      user: userPayload,
      session: {
        access_token: signUpData.session.access_token,
        refresh_token: signUpData.session.refresh_token,
      },
    })
  }

  return NextResponse.json({
    verificationRequired: true,
    email,
    message:
      'Check your email to verify your account, then sign in with your password.',
  })
}
