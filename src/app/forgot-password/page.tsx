'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { AuthShell } from '@/components/auth/AuthShell'
import {
  authInputClass,
  authLabelClass,
  authPrimaryBtnClass,
} from '@/components/auth/auth-styles'
import { getPasswordResetRedirectUrl } from '@/lib/auth/oauthRedirect'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return null
    return createBrowserClient(url, key)
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!supabase) {
      setError('Supabase is not configured')
      return
    }
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getPasswordResetRedirectUrl(),
    })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setSent(true)
  }

  return (
    <AuthShell>
      {!sent ? (
        <>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-[#B0B0B0] transition hover:text-[#E7E6D9]"
          >
            <span aria-hidden>←</span> Back to login
          </Link>
          <h1 className="mt-6 font-heading text-2xl font-semibold tracking-tight text-[#E7E6D9]">
            Reset your password
          </h1>
          <p className="mt-1.5 text-sm text-[#B0B0B0]">
            Enter your email and we&apos;ll send you a reset link.
          </p>
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className={authLabelClass}>
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className={authInputClass}
              />
            </div>
            {error && (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className={authPrimaryBtnClass}
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        </>
      ) : (
        <>
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            aria-hidden
          >
            ✓
          </div>
          <h1 className="text-center font-heading text-2xl font-semibold tracking-tight text-[#E7E6D9]">
            Check your email
          </h1>
          <p className="mt-3 text-center text-sm leading-relaxed text-[#B0B0B0]">
            We sent a password reset link to{' '}
            <span className="font-medium text-[#E7E6D9]">{email}</span>
          </p>
          <Link
            href="/login"
            className={`${authPrimaryBtnClass} mt-8 block text-center no-underline`}
          >
            Back to login
          </Link>
        </>
      )}
    </AuthShell>
  )
}
