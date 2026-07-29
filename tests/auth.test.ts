import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash, createHmac } from 'crypto'
import { buildSessionCookieValue, getRoleFromCookie } from '@/lib/auth'

// La cookie era texto plano sin firma: cualquiera armaba
// "authenticated_supervisor.<milisegundos>" y entraba sin contraseña.

test('acepta una cookie emitida por el propio login', () => {
  assert.equal(getRoleFromCookie(buildSessionCookieValue('supervisor')), 'supervisor')
  assert.equal(getRoleFromCookie(buildSessionCookieValue('analista')), 'analista')
})

test('rechaza el formato viejo sin firma', () => {
  assert.equal(getRoleFromCookie('authenticated_supervisor.99999999999999'), null)
  assert.equal(getRoleFromCookie('authenticated_analista.99999999999999'), null)
})

test('rechaza una firma alterada', () => {
  const cookie = buildSessionCookieValue('supervisor')
  const alterada = cookie.slice(0, -1) + (cookie.endsWith('A') ? 'B' : 'A')
  assert.equal(getRoleFromCookie(alterada), null)
})

test('rechaza un vencimiento estirado a mano', () => {
  const cookie = buildSessionCookieValue('analista')
  const estirada = cookie.replace(/\.\d+\./, '.99999999999999.')
  assert.equal(getRoleFromCookie(estirada), null)
})

test('rechaza una sesión vencida', () => {
  const clave = createHash('sha256').update('test-supervisor|test-analista').digest()
  const payload = `authenticated_supervisor.${Date.now() - 1000}`
  const firmada = `${payload}.${createHmac('sha256', clave).update(payload).digest('base64url')}`
  assert.equal(getRoleFromCookie(firmada), null)
})

test('un analista no puede forjar una sesión de supervisor con su contraseña', () => {
  // La clave se deriva de las DOS contraseñas, así que conocer una no alcanza.
  const claveAdivinada = createHash('sha256').update('test-analista|test-analista').digest()
  const payload = `authenticated_supervisor.${Date.now() + 3_600_000}`
  const falsa = `${payload}.${createHmac('sha256', claveAdivinada).update(payload).digest('base64url')}`
  assert.equal(getRoleFromCookie(falsa), null)
})

test('rechaza entradas mal formadas', () => {
  for (const v of [undefined, '', 'cualquier cosa', 'authenticated_supervisor', 'a.b.c.d']) {
    assert.equal(getRoleFromCookie(v), null, `debería rechazar: ${String(v)}`)
  }
})
