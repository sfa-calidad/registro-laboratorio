import { NextRequest, NextResponse } from 'next/server'
import { getRoleFromCookie } from '@/lib/auth'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  const session = req.cookies.get('lab_session')?.value
  const role = getRoleFromCookie(session)

  if (!role) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const response = NextResponse.next()
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
