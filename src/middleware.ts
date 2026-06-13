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
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (pathname.startsWith('/estadisticas') && role !== 'supervisor') {
    return NextResponse.redirect(new URL('/tareas', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
