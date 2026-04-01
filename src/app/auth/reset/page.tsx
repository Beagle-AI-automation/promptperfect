'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { validatePassword } from '@/lib/auth/validation'
import { AuthShell } from '@/components/auth/AuthShell'
import {
  authInputClass,
  authLabelClass,
  authPrimaryBtnClass,
} from '@/components/auth/auth-styles'

export default function AuthResetPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [recoveryReady, setRecoveryReady] = useState(false)
  const [sessionError, setSessionError] = useState(false)

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return null
    return createBrowserClient(url, key)
  }, [])

  // Wait for Supabase to process the recovery token from the URL hash.
  // Supabase fires PASSWORD_RECOVERY once the token is verified and a
  // temporary session is established — only then can updateUser() succeed.
  useEffect(() => {
    if (!supabase) return

    let didRecover = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        didRecover = true
        setRecoveryReady(true)
      }
    })

    // Fallback: if we already have an active recovery session (e.g. page reload)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        didRecover = true
        setRecoveryReady(true)
      }
    })

    // If no recovery event fires within 5 seconds, the link is invalid/expired
    const timeout = setTimeout(() => {
      if (!didRecover) setSessionError(true)
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [supabase])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!supabase) {
      setError('Supabase is not configured')
      return
    }
    const v = validatePassword(password)
    if (!v.isValid) {
      setError(v.errors[0] ?? 'Invalid password')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    await supabase.auth.signOut()
    setSuccess(true)
    setTimeout(() => router.push('/login'), 3000)
  }

  return (
    <AuthShell>
      {success ? (
        <>
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            aria-hidden
          >
            ✓
          </div>
          <h1 className="text-center font-heading text-2xl font-semibold tracking-tight text-[#E7E6D9]">
            Password updated
          </h1>
          <p className="mt-3 text-center text-sm text-[#B0B0B0]">
            Redirecting to login…
          </p>
        </>
      ) : sessionError && !recoveryReady ? (
        <>
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-400"
            aria-hidden
          >
            ✕
          </div>
          <h1 className="text-center font-heading text-2xl font-semibold tracking-tight text-[#E7E6D9]">
            Link expired or invalid
          </h1>
          <p className="mt-3 text-center text-sm text-[#B0B0B0]">
            This password reset link has expired or already been used.
          </p>
          <button
            type="button"
            onClick={() => router.push('/forgot-password')}
            className={`${authPrimaryBtnClass} mt-6`}
          >
            Request a new link
          </button>
        </>
      ) : !recoveryReady ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-[#252525] border-t-[#4552FF]"
            role="status"
            aria-label="Verifying reset link"
          />
          <p className="text-sm text-[#B0B0B0]">Verifying reset link…</p>
        </div>
      ) : (
        <>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[#E7E6D9]">
            Set new password
          </h1>
          <p className="mt-1.5 text-sm text-[#B0B0B0]">
            Min 8 characters, 1 uppercase, 1 number.
          </p>
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="new-password" className={authLabelClass}>
                New password
              </label>
              <input
                id="new-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className={authInputClass}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className={authLabelClass}>
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
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
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  )
}
