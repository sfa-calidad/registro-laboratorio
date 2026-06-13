import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const appPassword = process.env.APP_PASSWORD || 'laboratorio2024'

  if (password !== appPassword) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('lab_session', `authenticated_${appPassword}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })
  return res
}
