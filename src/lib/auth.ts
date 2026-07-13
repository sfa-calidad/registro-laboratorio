import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export type Role = 'supervisor' | 'analista'

// Duración máxima de la sesión. Configurable con SESSION_HOURS; por defecto 3 horas.
const configuredHours = Number(process.env.SESSION_HOURS)
export const SESSION_MAX_AGE_SECONDS =
  (Number.isFinite(configuredHours) && configuredHours > 0 ? configuredHours : 3) * 60 * 60

export function buildSessionCookieValue(role: Role): string {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  return `authenticated_${role}.${expiresAt}`
}

export function getRoleFromCookie(value: string | undefined): Role | null {
  if (!value) return null
  const [tag, expiresAtStr] = value.split('.')

  let role: Role | null = null
  if (tag === 'authenticated_supervisor') role = 'supervisor'
  else if (tag === 'authenticated_analista') role = 'analista'
  if (!role) return null

  // Las cookies sin vencimiento (formato viejo) dejan de ser válidas:
  // fuerza un único re-login y de ahí en más toda sesión expira sola.
  const expiresAt = Number(expiresAtStr)
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null

  return role
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
