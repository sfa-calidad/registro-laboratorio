import { NextRequest, NextResponse } from 'next/server'
import { getRoleFromCookie } from '@/lib/auth'

// Proxy de Next 16 (lo que antes era "middleware"). Corre en el runtime de
// Node.js, así que puede usar node:crypto para verificar la firma de la sesión.

const CABECERAS_SEGURIDAD: [string, string][] = [
  ['X-Content-Type-Options', 'nosniff'],
  ['X-Frame-Options', 'DENY'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
]

// Se aplican a TODA respuesta, también al login y a los 401. Antes se ponían
// solo en el camino autenticado, así que la pantalla de login quedaba sin
// ellas: enmarcable en un iframe.
function conCabeceras(res: NextResponse): NextResponse {
  for (const [k, v] of CABECERAS_SEGURIDAD) res.headers.set(k, v)
  return res
}

// Coincidencia exacta o con barra: '/login' y '/login/lo-que-sea' sí,
// '/loginfoo' no.
function esPublica(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname.startsWith('/api/auth/')
  )
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (esPublica(pathname)) {
    return conCabeceras(NextResponse.next())
  }

  const session = req.cookies.get('lab_session')?.value
  const role = getRoleFromCookie(session)

  if (!role) {
    if (pathname.startsWith('/api/')) {
      return conCabeceras(NextResponse.json({ error: 'No autorizado' }, { status: 401 }))
    }
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('from', pathname)
    return conCabeceras(NextResponse.redirect(loginUrl))
  }

  return conCabeceras(NextResponse.next())
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
