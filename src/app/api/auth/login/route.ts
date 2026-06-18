import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { password, role } = await req.json()

  const supervisorPwd = process.env.SUPERVISOR_PASSWORD || process.env.APP_PASSWORD
  const analistaPwd = process.env.ANALISTA_PASSWORD || process.env.APP_PASSWORD

  if (!supervisorPwd || !analistaPwd) {
    console.error('Login deshabilitado: falta configurar SUPERVISOR_PASSWORD/ANALISTA_PASSWORD (o APP_PASSWORD) en las variables de entorno')
    return NextResponse.json({ error: 'Login no configurado' }, { status: 503 })
  }

  let matchedRole: string | null = null
  if (role === 'supervisor' && password === supervisorPwd) {
    matchedRole = 'supervisor'
  } else if (role === 'analista' && password === analistaPwd) {
    matchedRole = 'analista'
  }

  if (!matchedRole) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true, role: matchedRole })
  res.cookies.set('lab_session', `authenticated_${matchedRole}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return res
}
