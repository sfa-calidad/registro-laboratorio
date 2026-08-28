import { test } from 'node:test'
import assert from 'node:assert/strict'
import { declaracionDePeriodo, mesAnterior } from '@/lib/precursores'

// Lo que sale de acá se copia a una declaración jurada, así que cada caso está
// tomado de la hoja "Sedronar" real.

const dia = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const DESDE = dia('2025-03-01')
const HASTA = dia('2025-03-31')

const metanol = { id: 1, nombre: 'Metanol', gtin: '88800000000509', unidad: 'L' }
const cloroformo = { id: 2, nombre: 'Cloroformo', gtin: '88800000001247', unidad: 'L' }

function insumo(over: Partial<Parameters<typeof declaracionDePeriodo>[1][number]> = {}) {
  return {
    id: 10,
    nombre: 'Metanol Pro Análisis',
    presentacion: '1 L',
    stock: 5,
    contenidoPorEnvase: 1,
    sustanciaId: 1,
    movimientos: [],
    ...over,
  }
}

test('una sustancia suma todos los insumos que la contienen', () => {
  // "Metanol" se declara una sola vez, aunque en el laboratorio haya un frasco
  // Pro Análisis y otro grado HPLC.
  const filas = declaracionDePeriodo(
    [metanol],
    [
      insumo({ id: 10, nombre: 'Metanol Pro Análisis', stock: 5 }),
      insumo({
        id: 11,
        nombre: 'Metanol grado HPLC',
        stock: 0,
        movimientos: [
          { tipo: 'CONSUMO', cantidad: 1, stockPrevio: 1, stockNuevo: 0, fecha: dia('2025-03-12') },
        ],
      }),
    ],
    DESDE,
    HASTA,
  )

  assert.equal(filas.length, 1)
  assert.deepEqual(filas[0].total, { inicial: 6, entradas: 0, salidas: 1, ajustes: 0, final: 5 })
  assert.equal(filas[0].insumos.length, 2)
  assert.deepEqual(filas[0].sinContenido, [])
})

test('los envases se pasan a la unidad en la que se declara', () => {
  // 5 botellas de 500 ml son 2,5 L, no 5.
  const filas = declaracionDePeriodo(
    [metanol],
    [insumo({ presentacion: '500 ml', stock: 5, contenidoPorEnvase: 0.5 })],
    DESDE,
    HASTA,
  )
  assert.equal(filas[0].total.final, 2.5)
  assert.equal(filas[0].insumos[0].envases.final, 5, 'en envases sigue siendo 5')
})

test('un insumo sin tamaño de envase se avisa en vez de sumar mal', () => {
  // Sin ese dato no hay forma de pasar de envases a litros. Sumarlo como si
  // fuera 1 metería un número inventado en la declaración.
  const filas = declaracionDePeriodo(
    [metanol],
    [
      insumo({ id: 10, nombre: 'Metanol Pro Análisis', stock: 5, contenidoPorEnvase: 1 }),
      insumo({ id: 11, nombre: 'Metanol sin medida', stock: 9, contenidoPorEnvase: null }),
    ],
    DESDE,
    HASTA,
  )
  assert.equal(filas[0].total.final, 5, 'solo suma el que se puede convertir')
  assert.deepEqual(filas[0].sinContenido, ['Metanol sin medida'])
  assert.equal(filas[0].insumos[1].declarado, null)
})

test('una sustancia sin insumos enlazados va en cero, no rompe', () => {
  const filas = declaracionDePeriodo([cloroformo], [], DESDE, HASTA)
  assert.deepEqual(filas[0].total, { inicial: 0, entradas: 0, salidas: 0, ajustes: 0, final: 0 })
  assert.deepEqual(filas[0].insumos, [])
})

test('cada insumo cuenta para su sustancia y no para la otra', () => {
  const filas = declaracionDePeriodo(
    [metanol, cloroformo],
    [
      insumo({ id: 10, sustanciaId: 1, stock: 5 }),
      insumo({ id: 20, nombre: 'Cloroformo', sustanciaId: 2, stock: 11 }),
    ],
    DESDE,
    HASTA,
  )
  assert.equal(filas[0].total.final, 5)
  assert.equal(filas[1].total.final, 11)
})

test('el total de una sustancia también cierra', () => {
  // La propiedad que la planilla no tenía: la resta no puede dar cualquier cosa.
  const filas = declaracionDePeriodo(
    [metanol],
    [
      insumo({
        id: 10,
        stock: 7,
        movimientos: [
          { tipo: 'ENTRADA', cantidad: 6, stockPrevio: 4, stockNuevo: 10, fecha: dia('2025-03-04') },
          { tipo: 'CONSUMO', cantidad: 2, stockPrevio: 10, stockNuevo: 8, fecha: dia('2025-03-18') },
          { tipo: 'AJUSTE', cantidad: 7, stockPrevio: 8, stockNuevo: 7, fecha: dia('2025-03-29') },
        ],
      }),
    ],
    DESDE,
    HASTA,
  )
  const t = filas[0].total
  assert.deepEqual(t, { inicial: 4, entradas: 6, salidas: 2, ajustes: -1, final: 7 })
  assert.equal(t.inicial + t.entradas - t.salidas + t.ajustes, t.final)
})

test('el período por defecto es el mes pasado completo', () => {
  assert.deepEqual(mesAnterior(dia('2025-04-15')), { desde: '2025-03-01', hasta: '2025-03-31' })
  assert.deepEqual(mesAnterior(dia('2025-03-02')), { desde: '2025-02-01', hasta: '2025-02-28' })
  // Enero mira a diciembre del año anterior.
  assert.deepEqual(mesAnterior(dia('2025-01-09')), { desde: '2024-12-01', hasta: '2024-12-31' })
  // Y febrero de un año bisiesto tiene 29.
  assert.deepEqual(mesAnterior(dia('2024-03-10')), { desde: '2024-02-01', hasta: '2024-02-29' })
})
