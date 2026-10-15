import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isUnlimitedMode } from '@/lib/localMode';

/** Page routes that require a Supabase session (userId from cookie JWT only). */
const PROTECTED = ['/library', '/profile', '/control-room'];

/**
 * Protected routes that are fully usable off localStorage in unlimited
 * local-dev mode — no sign-in redirect for these.
 */
const LOCAL_MODE_OPEN = ['/library'];

const corsHeaders = {
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
} as const;

/**
 * Preflight headers: echo the request Origin (never `*`) so browsers can
 * complete the handshake; actual access control is enforced per-route
 * (e.g. `/api/optimize-sync` allowlists ALLOWED_ORIGINS). Responses to real
 * requests carry no proxy-level CORS headers — routes that need them set
 * their own precise `Access-Control-Allow-Origin`.
 */
function preflightHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get('origin')?.trim();
  return {
    ...corsHeaders,
    ...(origin ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {}),
  };
}

/** Next.js 16+ proxy (edge): Supabase session + protected routes + API CORS preflight. */
export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (pathname.startsWith('/api')) {
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: preflightHeaders(req) });
    }
    // Mint a request id when the client didn't send one so server logs
    // (`lib/logger.ts`) can correlate each call end to end.
    const requestId =
      req.headers.get('x-request-id')?.trim() || crypto.randomUUID();
    const response = NextResponse.next();
    response.headers.set('x-request-id', requestId);
    return response;
  }

  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (c) =>
          c.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          ),
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isProtected && !user) {
    // Unlimited local-dev mode: routes with localStorage fallbacks stay open.
    if (
      isUnlimitedMode() &&
      LOCAL_MODE_OPEN.some((p) => pathname === p || pathname.startsWith(`${p}/`))
    ) {
      return res;
    }
    const login = req.nextUrl.clone();
    login.pathname = '/login';
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  return res;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/app',
    '/app/:path*',
    '/library',
    '/library/:path*',
    '/profile',
    '/profile/:path*',
    '/control-room',
    '/control-room/:path*',
  ],
};
