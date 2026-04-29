import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PROTECTED = ['/app', '/library', '/history', '/profile', '/control-room']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (c) => c.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options)),
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  const isProtected = PROTECTED.some(p => req.nextUrl.pathname.startsWith(p))
  if (isProtected && !user) {
    const login = req.nextUrl.clone()
    login.pathname = '/login'
    login.searchParams.set('next', req.nextUrl.pathname)
    return NextResponse.redirect(login)
  }
  return res
}

export const config = {
  matcher: ['/app/:path*', '/library/:path*', '/history/:path*', '/profile/:path*', '/control-room/:path*'],
}