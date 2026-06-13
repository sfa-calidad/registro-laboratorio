import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export type Role = 'supervisor' | 'analista'

export function getRoleFromCookie(value: string | undefined): Role | null {
  if (!value) return null
  if (value === 'authenticated_supervisor') return 'supervisor'
  if (value === 'authenticated_analista') return 'analista'
  // legacy cookie format support
  const legacy = process.env.APP_PASSWORD || 'laboratorio2024'
  if (value === `authenticated_${legacy}`) return 'supervisor'
  return null
}

export async function getRole(): Promise<Role | null> {
  const cookieStore = await cookies()
  const val = cookieStore.get('lab_session')?.value
  return getRoleFromCookie(val)
}

export function getRoleFromRequest(req: NextRequest): Role | null {
  const val = req.cookies.get('lab_session')?.value
  return getRoleFromCookie(val)
}
