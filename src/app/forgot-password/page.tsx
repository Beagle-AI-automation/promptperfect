'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/client/supabaseBrowser';
import { buildPasswordResetRedirectUrl } from '@/lib/auth/passwordResetRedirect';
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
  const [cooldownSec, setCooldownSec] = useState(0);
  const [recoveryLink, setRecoveryLink] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(true);
  const [googleHint, setGoogleHint] = useState<string | null>(null);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const configured = useMemo(() => Boolean(supabase), [supabase]);
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const t = window.setInterval(() => {
      setCooldownSec((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [cooldownSec]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setRecoveryLink(null);
    setGoogleHint(null);

    if (cooldownSec > 0) {
      setError(
        `Please wait ${cooldownSec} seconds before requesting another reset.`,
      );
      return;
    }
    if (!configured || !supabase) {
      setError('Supabase is not configured');
      return;
    }
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter your email address');
      return;
    }

    const redirectTo =
      typeof window !== 'undefined'
        ? buildPasswordResetRedirectUrl(window.location.origin)
        : undefined;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, redirectTo }),
      });
      const data = (await res.json()) as {
        error?: string;
        hint?: string;
        code?: string;
        ok?: boolean;
        emailSent?: boolean;
        recoveryLink?: string;
        message?: string;
        googleOnlyHint?: string;
      };

      if (!res.ok) {
        if (data.code === 'EMAIL_RATE_LIMIT') {
          const secMatch = data.error?.match(/Wait (\d+) seconds/i);
          setCooldownSec(secMatch ? Number(secMatch[1]) : 60);
        }
        const parts = [data.error || 'Something went wrong'];
        if (data.hint) parts.push(data.hint);
        setError(parts.join(' '));
        return;
      }

      if (data.googleOnlyHint) setGoogleHint(data.googleOnlyHint);
      setEmailSent(data.emailSent !== false);
      if (data.recoveryLink) setRecoveryLink(data.recoveryLink);
      if (data.message && !data.emailSent) setError(data.message);
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
              disabled={loading || cooldownSec > 0}
              className={authPrimaryBtnClass}
            >
              {loading
                ? 'Sending…'
                : cooldownSec > 0
                  ? `Wait ${cooldownSec}s…`
                  : 'Send reset link'}
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
            {emailSent ? 'Check your email' : 'Reset link ready'}
          </h1>
          {emailSent ? (
            <p className="mt-3 text-center text-sm leading-relaxed text-[#B0B0B0]">
              We sent a password reset link to{' '}
              <span className="font-medium text-[#E7E6D9]">{email.trim()}</span>.
              Open it to choose a new password (check spam too).
            </p>
          ) : (
            <p className="mt-3 text-center text-sm leading-relaxed text-[#B0B0B0]">
              Supabase did not send another email (rate limit or mail delay). On
              localhost you can use the direct link below instead.
            </p>
          )}
          {error && (
            <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-center text-sm text-amber-200">
              {error}
            </p>
          )}
          {googleHint && (
            <p className="mt-3 text-center text-sm text-[#B0B0B0]">{googleHint}</p>
          )}
          {recoveryLink && isLocalhost && (
            <div className="mt-4 rounded-lg border border-[#4552FF]/30 bg-[#4552FF]/10 p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#71717A]">
                Local dev — direct reset link
              </p>
              <a
                href={recoveryLink}
                className="break-all text-sm text-[#4552FF] hover:underline"
              >
                Open password reset link
              </a>
              <p className="mt-2 text-xs text-[#71717A]">
                Use this when Supabase email does not arrive. Link expires after
                a short time.
              </p>
            </div>
          )}
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
