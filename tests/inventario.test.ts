import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  alcanzaElStock,
  aplicarMovimiento,
  deltaDeMovimiento,
  escalarResumen,
  estadoInsumo,
  normalizarUbicacion,
  redondear,
  resumenPeriodo,
  sumarResumenes,
  unidadCompatible,
  RESUMEN_VACIO,
} from '@/lib/inventario'

// Los casos de este archivo salen de las dos planillas reales que reemplaza el
// módulo: "Stock Reactivos Actual 30-07-2025.xlsx" (70 reactivos + la hoja
// Sedronar) y "Stock Material de vidrio 21-08-2024.xlsx" (117 ítems).

// --- Movimientos -------------------------------------------------------------

test('la entrada suma y el consumo resta', () => {
  assert.equal(aplicarMovimiento(5, 'ENTRADA', 3), 8)
  assert.equal(aplicarMovimiento(5, 'CONSUMO', 2), 3)
  assert.equal(aplicarMovimiento(5, 'BAJA', 1), 4)
})

test('el ajuste no suma ni resta: fija el stock en lo contado', () => {
  // Es la diferencia con la planilla, donde corregir el número y consumir se
  // escriben igual: pisando la celda.
  assert.equal(aplicarMovimiento(5, 'AJUSTE', 3), 3)
  assert.equal(aplicarMovimiento(5, 'AJUSTE', 12), 12)
  assert.equal(aplicarMovimiento(0, 'AJUSTE', 0), 0)
})

test('los envases fraccionados no arrastran basura de coma flotante', () => {
  // 0,1 + 0,2 en flotantes da 0,30000000000000004, y ese resto terminaría
  // sumado en una declaración jurada.
  assert.equal(aplicarMovimiento(0.1, 'ENTRADA', 0.2), 0.3)
  assert.equal(redondear(0.1 + 0.2), 0.3)
})

test('el delta de un ajuste es el salto, no la cantidad contada', () => {
  assert.equal(deltaDeMovimiento({ tipo: 'ENTRADA', cantidad: 3, stockPrevio: 5, stockNuevo: 8 }), 3)
  assert.equal(deltaDeMovimiento({ tipo: 'CONSUMO', cantidad: 2, stockPrevio: 5, stockNuevo: 3 }), -2)
  assert.equal(deltaDeMovimiento({ tipo: 'BAJA', cantidad: 1, stockPrevio: 5, stockNuevo: 4 }), -1)
  // Se contaron 3 donde el sistema decía 5: el saldo bajó 2, aunque la
  // cantidad del asiento sea 3.
  assert.equal(deltaDeMovimiento({ tipo: 'AJUSTE', cantidad: 3, stockPrevio: 5, stockNuevo: 3 }), -2)
})

test('no se puede descontar más de lo que hay', () => {
  // El caso que la planilla deja pasar: en la hoja Sedronar el Cloroformo
  // figura con un consumo de −1.
  assert.equal(alcanzaElStock(5, 'CONSUMO', 6), false)
  assert.equal(alcanzaElStock(5, 'CONSUMO', 5), true, 'dejar en cero está bien')
  assert.equal(alcanzaElStock(5, 'BAJA', 6), false)
  // Sumar y corregir nunca se bloquean: un ajuste es justamente lo que se usa
  // cuando el número guardado está mal.
  assert.equal(alcanzaElStock(0, 'ENTRADA', 10), true)
  assert.equal(alcanzaElStock(0, 'AJUSTE', 10), true)
})

// --- Estado ------------------------------------------------------------------

test('avisa cuando no hay stock o está bajo el mínimo', () => {
  assert.equal(estadoInsumo({ stock: 0, stockMinimo: null, seControla: true }), 'SIN_STOCK')
  assert.equal(estadoInsumo({ stock: 2, stockMinimo: 3, seControla: true }), 'BAJO_MINIMO')
  assert.equal(estadoInsumo({ stock: 3, stockMinimo: 3, seControla: true }), 'BAJO_MINIMO', 'el mínimo es el piso, no el umbral')
  assert.equal(estadoInsumo({ stock: 4, stockMinimo: 3, seControla: true }), 'OK')
  assert.equal(estadoInsumo({ stock: 12, stockMinimo: null, seControla: true }), 'OK')
})

test('lo que no se cuenta en el laboratorio nunca avisa de faltante', () => {
  // Acetona y Hexano iban con "-" en la planilla: se piden a pañol. Un cero ahí
  // no significa que falten.
  assert.equal(estadoInsumo({ stock: 0, stockMinimo: null, seControla: false }), 'NO_CONTROLADO')
  assert.equal(estadoInsumo({ stock: 0, stockMinimo: 5, seControla: false }), 'NO_CONTROLADO')
})

test('no se puede declarar en litros algo que se mide en kilos', () => {
  // Sin densidad esa conversión no existe, y el resultado iría a una
  // declaración jurada.
  assert.equal(unidadCompatible('kg', 'kg'), true)
  assert.equal(unidadCompatible('L', 'L'), true)
  assert.equal(unidadCompatible('kg', 'L'), false)
  assert.equal(unidadCompatible('L', 'kg'), false)
  // Sin unidad cargada se deja pasar: la declaración lo muestra como incompleto
  // en vez de sumar algo inventado.
  assert.equal(unidadCompatible(null, 'L'), true)
  assert.equal(unidadCompatible(undefined, 'kg'), true)
})

// --- Ubicaciones --------------------------------------------------------------

test('unifica las ubicaciones escritas de varias formas', () => {
  // ~16 lugares reales escritos de 19 maneras entre las dos planillas.
  assert.equal(normalizarUbicacion('Laboratorio - heladera'), 'Laboratorio - Heladera')
  assert.equal(normalizarUbicacion('Laboratorio - Heladera'), 'Laboratorio - Heladera')
  assert.equal(normalizarUbicacion('Pañol/Labo  - Armario'), 'Pañol/Laboratorio - Armario')
  assert.equal(normalizarUbicacion('Laboratorio - Puerta 24 '), 'Laboratorio - Puerta 24')
  assert.equal(normalizarUbicacion('  Laboratorio  -  Puerta 2 '), 'Laboratorio - Puerta 2')
  assert.equal(normalizarUbicacion(''), '')
})

// --- Resumen de un período (declaración de precursores) ----------------------

const dia = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

test('el resumen del período cierra: inicial + entradas − salidas + ajustes = final', () => {
  const movimientos = [
    { tipo: 'ENTRADA', cantidad: 10, stockPrevio: 6, stockNuevo: 16, fecha: dia('2025-03-05') },
    { tipo: 'CONSUMO', cantidad: 4, stockPrevio: 16, stockNuevo: 12, fecha: dia('2025-03-20') },
    { tipo: 'AJUSTE', cantidad: 11, stockPrevio: 12, stockNuevo: 11, fecha: dia('2025-03-28') },
  ]
  const r = resumenPeriodo(11, movimientos, dia('2025-03-01'), dia('2025-03-31'))

  assert.deepEqual(r, { inicial: 6, entradas: 10, salidas: 4, ajustes: -1, final: 11 })
  assert.equal(r.inicial + r.entradas - r.salidas + r.ajustes, r.final)
})

test('los movimientos posteriores al período no ensucian el cierre', () => {
  // El saldo de hoy incluye lo que pasó después: hay que descontarlo para
  // reconstruir cómo terminó el período.
  const movimientos = [
    { tipo: 'CONSUMO', cantidad: 2, stockPrevio: 8, stockNuevo: 6, fecha: dia('2025-03-10') },
    { tipo: 'ENTRADA', cantidad: 20, stockPrevio: 6, stockNuevo: 26, fecha: dia('2025-04-02') },
  ]
  const r = resumenPeriodo(26, movimientos, dia('2025-03-01'), dia('2025-03-31'))
  assert.equal(r.final, 6, 'la entrada de abril no cuenta para marzo')
  assert.equal(r.inicial, 8)
  assert.equal(r.entradas, 0)
  assert.equal(r.salidas, 2)
})

test('los topes del período van incluidos', () => {
  const movimientos = [
    { tipo: 'CONSUMO', cantidad: 1, stockPrevio: 5, stockNuevo: 4, fecha: dia('2025-03-01') },
    { tipo: 'CONSUMO', cantidad: 1, stockPrevio: 4, stockNuevo: 3, fecha: dia('2025-03-31') },
  ]
  const r = resumenPeriodo(3, movimientos, dia('2025-03-01'), dia('2025-03-31'))
  assert.equal(r.salidas, 2, 'el primer y el último día del mes entran')
  assert.equal(r.inicial, 5)
})

test('un período sin movimientos deja el stock como estaba', () => {
  const r = resumenPeriodo(7, [], dia('2025-03-01'), dia('2025-03-31'))
  assert.deepEqual(r, { inicial: 7, entradas: 0, salidas: 0, ajustes: 0, final: 7 })
})

test('el orden en que se cargaron los asientos no cambia el resultado', () => {
  // Alguien puede registrar hoy un consumo de la semana pasada. El resumen se
  // reconstruye desde el saldo actual justamente para no depender de eso.
  const movimientos = [
    { tipo: 'CONSUMO', cantidad: 4, stockPrevio: 16, stockNuevo: 12, fecha: dia('2025-03-20') },
    { tipo: 'ENTRADA', cantidad: 10, stockPrevio: 6, stockNuevo: 16, fecha: dia('2025-03-05') },
  ]
  const alReves = resumenPeriodo(12, movimientos, dia('2025-03-01'), dia('2025-03-31'))
  assert.deepEqual(alReves, { inicial: 6, entradas: 10, salidas: 4, ajustes: 0, final: 12 })
})

test('la declaración pasa de envases a litros con el contenido del envase', () => {
  // 5 envases de 500 ml son 2,5 L, no 5.
  const enEnvases = { inicial: 5, entradas: 2, salidas: 1, ajustes: 0, final: 6 }
  assert.deepEqual(escalarResumen(enEnvases, 0.5), {
    inicial: 2.5, entradas: 1, salidas: 0.5, ajustes: 0, final: 3,
  })
})

test('una sustancia suma los insumos que la contienen', () => {
  // "Metanol" se declara una sola vez, aunque en el laboratorio haya un frasco
  // Pro Análisis y otro grado HPLC.
  const pa = escalarResumen({ inicial: 5, entradas: 0, salidas: 0, ajustes: 0, final: 5 }, 1)
  const hplc = escalarResumen({ inicial: 1, entradas: 0, salidas: 1, ajustes: 0, final: 0 }, 1)
  const total = [pa, hplc].reduce(sumarResumenes, RESUMEN_VACIO)
  assert.deepEqual(total, { inicial: 6, entradas: 0, salidas: 1, ajustes: 0, final: 5 })
  assert.equal(total.inicial + total.entradas - total.salidas + total.ajustes, total.final)
})

test('el consumo del Cloroformo deja de dar −1', () => {
  // En la hoja Sedronar el Cloroformo tiene STOCK 11 y DECLARADO 10, y la
  // fórmula DECLARADO − STOCK da −1: un consumo negativo, imposible. Con los
  // asientos, el consumo es lo que efectivamente salió.
  const movimientos = [
    { tipo: 'ENTRADA', cantidad: 10, stockPrevio: 4, stockNuevo: 14, fecha: dia('2025-02-10') },
    { tipo: 'CONSUMO', cantidad: 3, stockPrevio: 14, stockNuevo: 11, fecha: dia('2025-05-06') },
  ]
  const r = resumenPeriodo(11, movimientos, dia('2025-01-01'), dia('2025-12-31'))
  assert.equal(r.salidas, 3)
  assert.ok(r.salidas >= 0, 'un consumo no puede ser negativo')
  assert.equal(r.final, 11, 'coincide con el stock que declara la planilla')
})
