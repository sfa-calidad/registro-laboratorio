import { createHash, createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export type Role = 'supervisor' | 'analista'

// Duración máxima de la sesión. Configurable con SESSION_HOURS; por defecto 3 horas.
const configuredHours = Number(process.env.SESSION_HOURS)
export const SESSION_MAX_AGE_SECONDS =
  (Number.isFinite(configuredHours) && configuredHours > 0 ? configuredHours : 3) * 60 * 60

// Clave con la que se firma la cookie. Si no hay una SESSION_SECRET propia, se
// deriva de las contraseñas: ya son secretos del servidor, nunca viajan al
// cliente, y así no hay una variable de entorno más que se pueda olvidar en un
// deploy. La firma queda exactamente tan fuerte como la contraseña — quien la
// sepa puede loguearse igual — y como entran las dos, un analista no puede
// fabricarse una cookie de supervisor con la suya.
//
// Cambiar cualquiera de las dos contraseñas invalida las sesiones abiertas, que
// es justo lo que se espera al cambiarlas.
function claveDeFirma(): Buffer | null {
  const propia = process.env.SESSION_SECRET
  if (propia) return createHash('sha256').update(propia).digest()

  const supervisor = process.env.SUPERVISOR_PASSWORD || process.env.APP_PASSWORD
  const analista = process.env.ANALISTA_PASSWORD || process.env.APP_PASSWORD
  // Sin contraseñas configuradas no hay login posible (el endpoint devuelve
  // 503), así que acá se falla cerrado en vez de firmar con algo previsible.
  if (!supervisor || !analista) return null

  return createHash('sha256').update(`${supervisor}|${analista}`).digest()
}

function firmar(payload: string, clave: Buffer): string {
  return createHmac('sha256', clave).update(payload).digest('base64url')
}

export function buildSessionCookieValue(role: Role): string {
  const clave = claveDeFirma()
  if (!clave) throw new Error('No hay contraseñas configuradas: no se puede firmar la sesión')
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  const payload = `authenticated_${role}.${expiresAt}`
  return `${payload}.${firmar(payload, clave)}`
}

export function getRoleFromCookie(value: string | undefined): Role | null {
  if (!value) return null

  // rol.vencimiento.firma — el vencimiento va dentro de lo firmado, así que no
  // se puede estirar una sesión editando la cookie.
  const partes = value.split('.')
  if (partes.length !== 3) return null
  const [tag, expiresAtStr, firmaRecibida] = partes

  let role: Role | null = null
  if (tag === 'authenticated_supervisor') role = 'supervisor'
  else if (tag === 'authenticated_analista') role = 'analista'
  if (!role) return null

  const expiresAt = Number(expiresAtStr)
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null

  const clave = claveDeFirma()
  if (!clave) return null

  const esperada = Buffer.from(firmar(`${tag}.${expiresAtStr}`, clave))
  const recibida = Buffer.from(firmaRecibida)
  // timingSafeEqual exige la misma longitud; distinta longitud ya es un rechazo.
  if (esperada.length !== recibida.length) return null
  if (!timingSafeEqual(esperada, recibida)) return null

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
