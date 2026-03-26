'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

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
      redirectTo: `${window.location.origin}/auth/reset`,
    })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-[#252525] rounded-xl p-8">
        {!sent ? (
          <>
            <Link
              href="/login"
              className="text-sm text-[#B0B0B0] hover:text-[#E7E6D9] inline-flex items-center gap-1"
            >
              ← Back to login
            </Link>
            <h1 className="mt-6 font-heading text-2xl font-semibold text-[#E7E6D9]">
              Reset your password
            </h1>
            <p className="mt-2 text-sm text-[#B0B0B0]">
              Enter your email and we&apos;ll send you a reset link.
            </p>
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full bg-[#0A0A0A] border border-[#252525] text-white placeholder-[#71717A] focus:border-[#4552FF] rounded-lg p-3 outline-none"
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#4552FF] hover:bg-[#5B6CFF] text-white rounded-lg py-3 font-medium disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="font-heading text-2xl font-semibold text-[#E7E6D9]">
              Check your email
            </h1>
            <p className="mt-3 text-sm text-[#B0B0B0]">
              We sent a password reset link to {email}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
