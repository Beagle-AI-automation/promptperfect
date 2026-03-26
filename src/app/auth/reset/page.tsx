'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { validatePassword } from '@/lib/auth/validation'

export default function AuthResetPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

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
    setSuccess(true)
    setTimeout(() => router.push('/login'), 3000)
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-[#252525] rounded-xl p-8">
        {!success ? (
          <>
            <h1 className="font-heading text-2xl font-semibold text-[#E7E6D9]">
              Set new password
            </h1>
            <p className="mt-2 text-sm text-[#B0B0B0]">
              Min 8 characters, 1 uppercase, 1 number.
            </p>
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                autoComplete="new-password"
                className="w-full bg-[#0A0A0A] border border-[#252525] text-white placeholder-[#71717A] focus:border-[#4552FF] rounded-lg p-3 outline-none"
              />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
                className="w-full bg-[#0A0A0A] border border-[#252525] text-white placeholder-[#71717A] focus:border-[#4552FF] rounded-lg p-3 outline-none"
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#4552FF] hover:bg-[#5B6CFF] text-white rounded-lg py-3 font-medium disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="font-heading text-2xl font-semibold text-[#E7E6D9]">
              Password updated!
            </h1>
            <p className="mt-3 text-sm text-[#B0B0B0]">
              Redirecting to login...
            </p>
          </>
        )}
      </div>
    </div>
  )
}
