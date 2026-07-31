import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  cobertura,
  contarPorNombre,
  diaDeTimestamp,
  diasEntre,
  estaDemorada,
  etiquetaSemana,
  inicioDeSemana,
  mediana,
  percentil,
  SIN_ASIGNAR,
  tiemposDeCierre,
  tramoAntiguedad,
  ultimasSemanas,
} from '@/lib/metricas'

test('mediana con cantidad impar y par', () => {
  assert.equal(mediana([5, 1, 3]), 3)
  assert.equal(mediana([4, 1, 3, 2]), 2.5)
  assert.equal(mediana([]), null)
  assert.equal(mediana([7]), 7)
})

test('la mediana aguanta un valor extremo y el promedio no', () => {
  // El caso que justifica no usar promedio: una muestra olvidada tres meses.
  const dias = [2, 3, 3, 4, 90]
  assert.equal(mediana(dias), 3)
  const promedio = dias.reduce((a, b) => a + b, 0) / dias.length
  assert.equal(promedio, 20.4, 'el promedio queda lejos de lo que pasa siempre')
})

test('percentil 90 devuelve un valor observado', () => {
  assert.equal(percentil([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90), 9)
  assert.equal(percentil([2, 3, 3, 4, 90], 90), 90)
  assert.equal(percentil([5], 90), 5)
  assert.equal(percentil([], 90), null)
})

test('diasEntre cuenta días enteros sin importar la hora', () => {
  assert.equal(diasEntre('2026-07-01T00:00:00.000Z', '2026-07-08T00:00:00.000Z'), 7)
  assert.equal(diasEntre('2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'), 0)
  // Aunque la de llegada traiga hora, sigue siendo un día de diferencia.
  assert.equal(diasEntre('2026-07-01T00:00:00.000Z', '2026-07-02T23:30:00.000Z'), 1)
})

test('los tramos de antigüedad cortan en los bordes exactos', () => {
  assert.equal(tramoAntiguedad(0), '0-7')
  assert.equal(tramoAntiguedad(7), '0-7')
  assert.equal(tramoAntiguedad(8), '8-15')
  assert.equal(tramoAntiguedad(15), '8-15')
  assert.equal(tramoAntiguedad(16), '16-30')
  assert.equal(tramoAntiguedad(30), '16-30')
  assert.equal(tramoAntiguedad(31), '+30')
  assert.equal(tramoAntiguedad(400), '+30')
})

test('una muestra enviada se considera demorada recién pasados los 15 días', () => {
  const ahora = new Date('2026-07-30T12:00:00Z')
  const base = { estado: 'ENVIADA', protocolo: null as string | null }

  // 15 días justos todavía no es demora; 16 sí.
  assert.equal(estaDemorada({ ...base, fechaEnvio: '2026-07-15T00:00:00.000Z' }, ahora), false)
  assert.equal(estaDemorada({ ...base, fechaEnvio: '2026-07-14T00:00:00.000Z' }, ahora), true)

  // Con protocolo cargado ya no es demora, por más viejo que sea.
  assert.equal(
    estaDemorada({ estado: 'ENVIADA', protocolo: 'PROT-1', fechaEnvio: '2026-01-01T00:00:00.000Z' }, ahora),
    false
  )
  // Y una que nunca se envió tampoco.
  assert.equal(estaDemorada({ ...base, fechaEnvio: null }, ahora), false)
  assert.equal(
    estaDemorada({ estado: 'EN_ANALISIS', protocolo: null, fechaEnvio: '2026-01-01T00:00:00.000Z' }, ahora),
    false
  )
})

test('la semana arranca el lunes', () => {
  assert.equal(inicioDeSemana('2026-07-30T00:00:00.000Z'), '2026-07-27') // jueves
  assert.equal(inicioDeSemana('2026-07-27T00:00:00.000Z'), '2026-07-27') // lunes
  assert.equal(inicioDeSemana('2026-08-02T00:00:00.000Z'), '2026-07-27') // domingo
  assert.equal(inicioDeSemana('2026-08-03T00:00:00.000Z'), '2026-08-03') // lunes siguiente
  assert.equal(etiquetaSemana('2026-07-27'), '27/07')
})

test('las últimas semanas van de la más vieja a la más nueva y terminan en la de hoy', () => {
  const semanas = ultimasSemanas(4, new Date('2026-07-30T12:00:00Z'))
  assert.deepEqual(semanas, ['2026-07-06', '2026-07-13', '2026-07-20', '2026-07-27'])
})

test('un timestamp de las 22:00 hora argentina no se pasa al día siguiente', () => {
  // 2026-07-30 22:00 en Argentina son las 01:00 UTC del 31.
  assert.equal(diaDeTimestamp('2026-07-31T01:00:00.000Z'), '2026-07-30')
  assert.equal(diaDeTimestamp('2026-07-30T15:00:00.000Z'), '2026-07-30')
  // Y la semana que le corresponde también es la del 30, no la siguiente.
  assert.equal(inicioDeSemana(`${diaDeTimestamp('2026-07-31T01:00:00.000Z')}T00:00:00.000Z`), '2026-07-27')
})

test('tiemposDeCierre distingue lo cerrado de lo que se puede medir', () => {
  const r = tiemposDeCierre([
    { fecha: '2026-07-01T00:00:00.000Z', fechaResultado: '2026-07-03T00:00:00.000Z', estado: 'CON_RESULTADO', laboratorio: 'SFA' },
    { fecha: '2026-07-01T00:00:00.000Z', fechaResultado: '2026-07-11T00:00:00.000Z', estado: 'CON_RESULTADO', laboratorio: 'SFA' },
    // cerrada por protocolo, sin fecha de resultado: no se puede medir
    { fecha: '2026-07-01T00:00:00.000Z', fechaResultado: null, estado: 'CON_RESULTADO', laboratorio: 'SFA' },
    // todavía abierta: no cuenta
    { fecha: '2026-07-01T00:00:00.000Z', fechaResultado: null, estado: 'ENVIADA', laboratorio: 'Intertek' },
  ])
  assert.equal(r.cerradas, 3)
  assert.equal(r.medidas, 2)
  assert.equal(r.medianaDias, 6) // (2 + 10) / 2
  assert.equal(r.p90Dias, 10)
})

test('tiemposDeCierre descarta una fecha de resultado anterior a la de toma', () => {
  const r = tiemposDeCierre([
    { fecha: '2026-07-10T00:00:00.000Z', fechaResultado: '2026-07-01T00:00:00.000Z', estado: 'CON_RESULTADO', laboratorio: 'SFA' },
  ])
  assert.equal(r.cerradas, 1)
  assert.equal(r.medidas, 0, 'un error de carga no puede ensuciar la mediana')
  assert.equal(r.medianaDias, null)
})

test('sin muestras cerradas no hay mediana en vez de cero', () => {
  const r = tiemposDeCierre([
    { fecha: '2026-07-01T00:00:00.000Z', fechaResultado: null, estado: 'IDENTIFICADA', laboratorio: null },
  ])
  assert.equal(r.medianaDias, null, 'cero significaría "salió el mismo día"')
  assert.equal(r.cerradas, 0)
})

test('la cobertura mide sobre cuánto se puede comparar gente', () => {
  assert.deepEqual(cobertura(['Ana', null, 'Beto', '', '  ']), { conDato: 2, total: 5, porcentaje: 40 })
  assert.deepEqual(cobertura([]), { conDato: 0, total: 0, porcentaje: 0 })
})

test('lo que no tiene analista cargado se cuenta aparte, no se descarta', () => {
  const cuenta = contarPorNombre(['Ana Pérez', null, 'Ana Pérez', '', 'Beto Díaz'])
  assert.equal(cuenta.get('Ana Pérez'), 2)
  assert.equal(cuenta.get('Beto Díaz'), 1)
  assert.equal(cuenta.get(SIN_ASIGNAR), 2)
  // El total tiene que dar la cantidad de registros: nada se pierde.
  assert.equal([...cuenta.values()].reduce((a, b) => a + b, 0), 5)
})
