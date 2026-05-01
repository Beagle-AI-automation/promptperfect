import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PROTECTED = ['/app', '/library', '/history', '/profile', '/control-room'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
} as const;

/** Next.js 16+ proxy (edge): Supabase session + protected routes + API CORS preflight. */
export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (pathname.startsWith('/api')) {
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: corsHeaders });
    }
    const response = NextResponse.next();
    for (const [k, v] of Object.entries(corsHeaders)) {
      response.headers.set(k, v);
    }
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

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  if (isProtected && !user) {
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
    '/app/:path*',
    '/library/:path*',
    '/history/:path*',
    '/profile/:path*',
    '/control-room/:path*',
  ],
};
