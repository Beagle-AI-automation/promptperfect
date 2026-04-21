'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import {
  authInputClass,
  authLabelClass,
  authPrimaryBtnClass,
} from '@/components/auth/auth-styles';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const configured = useMemo(() => {
    return Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!configured) {
      setError('Supabase is not configured');
      return;
    }
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter your email address');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = (await res.json()) as {
        error?: string;
        hint?: string;
        code?: string;
      };

      if (!res.ok) {
        const parts = [data.error || 'Something went wrong'];
        if (data.hint) parts.push(data.hint);
        setError(parts.join(' '));
        return;
      }

      setSent(true);
    } finally {
      setLoading(false);
    }
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
            Enter your email and we&apos;ll send you a reset link if you have an
            account.
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
            <span className="font-medium text-[#E7E6D9]">{email.trim()}</span>.
            Open it to choose a new password (link expires after a while).
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
  );
}
