import { validatePassword, validateEmail } from '@/lib/auth/validation'
import { checkRateLimit } from '@/lib/auth/rateLimit'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key =
    process.env.SUPABASE_SERVICE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) return null
  return createClient(url, key)
}

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait a minute.' },
      { status: 429 }
    )
  }

  const body = await request.json()
  const email = typeof body.email === 'string' ? body.email.trim() : ''
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
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const uid = data.user?.id
  if (uid) {
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
        { status: 500 }
      )
    }
  }

  const { data: profile } = await supabase
    .from('pp_users')
    .select('id, name, email, provider, model')
    .eq('email', email)
    .maybeSingle()

  return NextResponse.json({
    user: profile ?? data.user,
  })
}
