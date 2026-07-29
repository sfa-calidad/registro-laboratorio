import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { formatDate, formatDateOnly, hoyEnLaboratorio, parseId, sumarDias, todayISO } from '@/lib/utils'

// Congela `new Date()` sin argumentos en un instante dado, para poder probar
// qué pasa a las 21:30 hora argentina (que es medianoche y media en UTC).
const RealDate = Date
function conReloj(iso: string) {
  const fijo = new RealDate(iso)
  class DateFalso extends RealDate {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(...args: any[]) {
      if (args.length === 0) super(fijo.getTime())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      else super(...(args as [any]))
    }
  }
  ;(globalThis as { Date: unknown }).Date = DateFalso
}
afterEach(() => {
  ;(globalThis as { Date: unknown }).Date = RealDate
})

test('todayISO da el día del laboratorio, no el de UTC', () => {
  conReloj('2026-07-27T17:00:00Z') // 14:00 en Argentina
  assert.equal(todayISO(), '2026-07-27')

  // 21:30 del 27 en Argentina ya es el 28 en UTC: acá estaba el bug, todo lo
  // cargado en el turno tarde quedaba fechado un día adelante.
  conReloj('2026-07-28T00:30:00Z')
  assert.equal(todayISO(), '2026-07-27')

  conReloj('2026-07-28T02:59:00Z') // 23:59 del 27
  assert.equal(todayISO(), '2026-07-27')

  conReloj('2026-07-28T03:01:00Z') // 00:01 del 28
  assert.equal(todayISO(), '2026-07-28')
})

test('hoyEnLaboratorio es la medianoche UTC del día de acá', () => {
  conReloj('2026-07-28T00:30:00Z')
  assert.equal(hoyEnLaboratorio().toISOString(), '2026-07-27T00:00:00.000Z')
})

test('el rango "hoy" del dashboard deja afuera mañana y el futuro', () => {
  conReloj('2026-07-28T00:30:00Z') // 21:30 del 27 en Argentina
  const hoy = hoyEnLaboratorio()
  const manana = sumarDias(hoy, 1)
  const entra = (f: string) => {
    const d = new RealDate(f)
    return d >= hoy && d < manana
  }
  assert.equal(entra('2026-07-27T00:00:00Z'), true, 'el de hoy tiene que entrar')
  assert.equal(entra('2026-07-28T00:00:00Z'), false, 'el de mañana no')
  assert.equal(entra('2026-08-28T00:00:00Z'), false, 'uno con fecha futura tampoco')
})

test('formatDateOnly muestra el mismo día calendario en cualquier zona', () => {
  assert.equal(formatDateOnly('2026-01-01T00:00:00.000Z'), '01/01/2026')
  assert.equal(formatDateOnly(new Date('2026-12-31T00:00:00.000Z')), '31/12/2026')
})

test('el año de una muestra se lee por componentes UTC', () => {
  // Leído en hora local, el 1 de enero se ve como el 31 de diciembre anterior:
  // las muestras de ese día quedaban fuera del contador anual todo el año.
  const primeroDeEnero = new Date('2026-01-01T00:00:00.000Z')
  assert.equal(primeroDeEnero.getUTCFullYear(), 2026)
})

test('formatDate es para timestamps reales', () => {
  assert.equal(formatDate('2026-07-28T12:00:00.000Z'), '28/07/2026')
})

test('parseId solo acepta enteros positivos', () => {
  assert.equal(parseId('7'), 7)
  assert.equal(parseId('abc'), null)
  assert.equal(parseId('-1'), null)
  assert.equal(parseId('0'), null)
  assert.equal(parseId('1.5'), null)
  assert.equal(parseId(''), null)
})
