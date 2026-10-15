import type { NextConfig } from 'next';
import path from 'path';

/**
 * Transport-security policies (CSP `upgrade-insecure-requests` + HSTS) are
 * production-only.
 *
 * In development the server speaks plain HTTP, and WebKit (Safari on macOS/iOS)
 * honours `upgrade-insecure-requests` even for `localhost` — unlike Chromium and
 * Firefox, which treat loopback as a trustworthy origin. WebKit therefore
 * rewrites every `/_next/static/*` asset to `https://localhost:3000/...`, the
 * TLS handshake fails against the HTTP dev server, no chunk ever loads, React
 * never hydrates and the page is stuck on the server-rendered "Loading…"
 * fallback. Chromium hides the problem, so this is Safari-only in practice.
 */
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  turbopack: {
    // Ensure Turbopack resolves deps/config from this app folder in a workspace repo.
    root: path.resolve(__dirname),
  },
  async headers() {
    // Pragmatic CSP: Next.js + Tailwind need 'unsafe-inline' for scripts and
    // styles. Everything else is locked to 'self' except Supabase (API +
    // realtime) and remote images (OAuth avatars). Tighten connect-src to the
    // project-specific Supabase host if a single backend is used.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      'frame-ancestors \'none\'',
      // Never in dev — see IS_PRODUCTION above.
      ...(IS_PRODUCTION ? ['upgrade-insecure-requests'] : []),
    ].join('; ');
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // HSTS is only honoured over HTTPS, so it is meaningless (and
          // misleading) in dev; keep it for production deployments only.
          ...(IS_PRODUCTION
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]
            : []),
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
