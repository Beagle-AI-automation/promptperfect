'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/client/supabaseBrowser';
import { validatePassword } from '@/lib/auth/validation';
import { AuthShell } from '@/components/auth/AuthShell';
import {
  authInputClass,
  authLabelClass,
  authPrimaryBtnClass,
} from '@/components/auth/auth-styles';

export default function AuthResetPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    let cancelled = false;

    async function initRecoverySession() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        const { error: exchangeErr } =
          await client.auth.exchangeCodeForSession(code);
        if (!cancelled && exchangeErr) {
          setError(
            'This reset link is invalid or expired. Request a new link from the forgot-password page.',
          );
          setSessionReady(true);
          return;
        }
      }

      const {
        data: { session },
      } = await client.auth.getSession();

      if (!cancelled && !session) {
        setError(
          'Open the password reset link from your email in this browser. If it expired, request a new one.',
        );
      }

      if (!cancelled) setSessionReady(true);
    }

    void initRecoverySession();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!supabase) {
      setError('Supabase is not configured');
      return;
    }
    const v = validatePassword(password);
    if (!v.isValid) {
      setError(v.errors[0] ?? 'Invalid password');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push('/login'), 3000);
  }

  if (!sessionReady) {
    return (
      <AuthShell>
        <p className="text-center text-sm text-[#B0B0B0]">Loading reset link…</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      {!success ? (
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
                disabled={Boolean(error && !password)}
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
                disabled={Boolean(error && !password)}
              />
            </div>
            {error && (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}
            {!error || password ? (
              <button
                type="submit"
                disabled={loading}
                className={authPrimaryBtnClass}
              >
                {loading ? 'Updating…' : 'Update password'}
              </button>
            ) : (
              <Link
                href="/forgot-password"
                className={`${authPrimaryBtnClass} block text-center no-underline`}
              >
                Request a new reset link
              </Link>
            )}
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
            Password updated
          </h1>
          <p className="mt-3 text-center text-sm text-[#B0B0B0]">
            Redirecting to login…
          </p>
        </>
      )}
    </AuthShell>
  );
}
