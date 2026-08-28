// Reglas del inventario de insumos. Todo lo que decide un número vive acá y no
// en los componentes, para que tenga test (mismo criterio que calculos.ts).
//
// La idea de fondo del módulo: el stock no es un número que se pisa, es el
// saldo de un registro de movimientos. Cada asiento guarda el saldo antes y
// después, así el historial se lee sin recalcular y el resumen de un período se
// puede reconstruir aunque los asientos se hayan cargado desordenados.

export type TipoMovimiento = 'ENTRADA' | 'CONSUMO' | 'BAJA' | 'AJUSTE'

export const TIPOS_MOVIMIENTO: { tipo: TipoMovimiento; etiqueta: string; ayuda: string }[] = [
  { tipo: 'ENTRADA', etiqueta: 'Entrada', ayuda: 'Llegó mercadería: suma al stock' },
  { tipo: 'CONSUMO', etiqueta: 'Consumo', ayuda: 'Se usó en el laboratorio: resta del stock' },
  { tipo: 'BAJA', etiqueta: 'Baja', ayuda: 'Se rompió, se venció o se descartó: resta del stock' },
  { tipo: 'AJUSTE', etiqueta: 'Ajuste', ayuda: 'Se contó y el número era otro: fija el stock' },
]

export function esTipoMovimiento(v: string): v is TipoMovimiento {
  return TIPOS_MOVIMIENTO.some((t) => t.tipo === v)
}

// Los envases se cuentan de a uno, pero el contenido lleva decimales (0,25 kg
// por pote). Sumar flotantes arrastra basura — 0,1 + 0,2 da 0,30000000000000004
// — y esa basura terminaría en una declaración jurada. Todo lo que sale de acá
// pasa por este redondeo.
export function redondear(n: number, decimales = 4): number {
  const factor = 10 ** decimales
  return Math.round(n * factor) / factor
}

// Cuánto queda después del movimiento. El AJUSTE no suma ni resta: fija el
// saldo en lo que se contó.
export function aplicarMovimiento(stockPrevio: number, tipo: TipoMovimiento, cantidad: number): number {
  switch (tipo) {
    case 'ENTRADA':
      return redondear(stockPrevio + cantidad)
    case 'CONSUMO':
    case 'BAJA':
      return redondear(stockPrevio - cantidad)
    case 'AJUSTE':
      return redondear(cantidad)
  }
}

// Cuánto movió el saldo un asiento ya grabado. Para el ajuste no alcanza con la
// cantidad (que es lo contado, no la diferencia): hay que mirar el salto.
export function deltaDeMovimiento(m: {
  tipo: string
  cantidad: number
  stockPrevio: number
  stockNuevo: number
}): number {
  if (m.tipo === 'AJUSTE') return redondear(m.stockNuevo - m.stockPrevio)
  if (m.tipo === 'ENTRADA') return redondear(m.cantidad)
  return redondear(-m.cantidad)
}

// No se puede descontar lo que no hay. Es justo el error que la planilla deja
// pasar: en la hoja Sedronar el Cloroformo figura con un consumo de −1.
export function alcanzaElStock(stock: number, tipo: TipoMovimiento, cantidad: number): boolean {
  if (tipo !== 'CONSUMO' && tipo !== 'BAJA') return true
  return redondear(stock - cantidad) >= 0
}

// --- Estado de un insumo -----------------------------------------------------

export type EstadoInsumo = 'NO_CONTROLADO' | 'SIN_STOCK' | 'BAJO_MINIMO' | 'OK'

export const ETIQUETA_ESTADO: Record<EstadoInsumo, string> = {
  NO_CONTROLADO: 'No se cuenta acá',
  SIN_STOCK: 'Sin stock',
  BAJO_MINIMO: 'Bajo mínimo',
  OK: 'OK',
}

// Un insumo que no se controla nunca avisa: o se pide a pañol, o todavía no se
// contó por primera vez. Un cero ahí no significa que falte.
export function estadoInsumo(insumo: {
  stock: number
  stockMinimo: number | null
  seControla: boolean
}): EstadoInsumo {
  if (!insumo.seControla) return 'NO_CONTROLADO'
  if (insumo.stock <= 0) return 'SIN_STOCK'
  if (insumo.stockMinimo !== null && insumo.stock <= insumo.stockMinimo) return 'BAJO_MINIMO'
  return 'OK'
}

export function necesitaReposicion(insumo: {
  stock: number
  stockMinimo: number | null
  seControla: boolean
}): boolean {
  const estado = estadoInsumo(insumo)
  return estado === 'SIN_STOCK' || estado === 'BAJO_MINIMO'
}

// Un insumo medido en kilos no puede colgar de una sustancia que se declara en
// litros: sin densidad esa conversión no existe, y el resultado iría a una
// declaración jurada. Sin unidad cargada se deja pasar: ahí el insumo aparece
// como incompleto en la declaración, que avisa en vez de sumar algo inventado.
export function unidadCompatible(
  unidadInsumo: string | null | undefined,
  unidadSustancia: string,
): boolean {
  return !unidadInsumo || unidadInsumo === unidadSustancia
}

// --- Lectura de las planillas de Excel ---------------------------------------

// Cuánto entra en un envase, normalizado a litros o kilos. Los gramos y los
// mililitros se convierten acá y no al usar el dato: así el número guardado ya
// está en la unidad en la que se declara.
const FACTOR_UNIDAD: Record<string, { base: 'L' | 'kg'; factor: number }> = {
  lt: { base: 'L', factor: 1 },
  l: { base: 'L', factor: 1 },
  ml: { base: 'L', factor: 0.001 },
  kg: { base: 'kg', factor: 1 },
  g: { base: 'kg', factor: 0.001 },
  mg: { base: 'kg', factor: 0.000001 },
}

// Cómo se escribe cada unidad al mostrarla (la planilla mezcla "lt", "Kg", "L").
const UNIDAD_MOSTRADA: Record<string, string> = {
  lt: 'L', l: 'L', ml: 'ml', kg: 'kg', g: 'g', mg: 'mg',
}

// El tamaño del envase viene metido en el nombre: "(x 1lt)", "(x 250g)",
// "(unid. 0,05L)", "(5L)". El paréntesis tiene que empezar con el número (o con
// "x"/"unid.") para no confundirlo con los otros paréntesis del nombre, que son
// muchos: "(Pro Analisis)", "(Karl Fischer)", "(Cicarelli)", "(II)".
const RE_PRESENTACION = /\(\s*(?:x\s*|unid\.?\s*)?(\d+(?:[.,]\d+)?)\s*(lt|ml|mg|kg|l|g)\s*\)/i

// La planilla anota el vencimiento dentro del nombre, que es justamente lo que
// hace que no se pueda ordenar ni filtrar por él.
const RE_VENCIDO = /\s*\((vencidos?)\)/i

export type NombreDePlanilla = {
  nombre: string
  presentacion: string
  contenido: number | null
  unidadContenido: 'L' | 'kg' | null
  nota: string | null
}

export function parseNombreDePlanilla(raw: string): NombreDePlanilla {
  let nombre = raw.replace(/\s+/g, ' ').trim()
  let nota: string | null = null

  if (RE_VENCIDO.test(nombre)) {
    nombre = nombre.replace(RE_VENCIDO, '').trim()
    nota = 'Marcado como vencido en la planilla original'
  }

  const m = nombre.match(RE_PRESENTACION)
  if (!m) {
    return { nombre, presentacion: '', contenido: null, unidadContenido: null, nota }
  }

  const numero = Number(m[1].replace(',', '.'))
  const unidad = m[2].toLowerCase()
  const { base, factor } = FACTOR_UNIDAD[unidad]

  return {
    nombre: nombre.replace(RE_PRESENTACION, '').replace(/\s+/g, ' ').trim(),
    presentacion: `${formatearNumero(numero)} ${UNIDAD_MOSTRADA[unidad]}`,
    contenido: redondear(numero * factor, 6),
    unidadContenido: base,
    nota,
  }
}

// Coma decimal, sin ceros de más: 1 → "1", 0.05 → "0,05".
export function formatearNumero(n: number): string {
  return String(redondear(n, 6)).replace('.', ',')
}

// Los ~16 lugares reales de las dos planillas estaban escritos de 19 formas.
// Las variantes conocidas van en un mapa explícito, como NORMALIZACION_PRODUCTOS
// en scripts/importar-planillas.ts; lo que no está solo se limpia de espacios.
const ALIAS_UBICACION: Record<string, string> = {
  'laboratorio - heladera': 'Laboratorio - Heladera',
  'pañol/labo - armario': 'Pañol/Laboratorio - Armario',
  'pañol/labo- armario': 'Pañol/Laboratorio - Armario',
  'pañol/laboratorio': 'Pañol/Laboratorio',
}

export function normalizarUbicacion(raw: string): string {
  const limpio = raw.replace(/\s+/g, ' ').trim()
  if (!limpio) return ''
  return ALIAS_UBICACION[limpio.toLowerCase()] ?? limpio
}

// La columna Cantidad mezcla tres cosas que Excel no distingue: un número, un
// "-" (se pide a pañol, no se cuenta en el laboratorio) y la celda vacía (nunca
// se contó). Las dos últimas no son un cero.
export type CantidadDePlanilla = {
  stock: number
  seControla: boolean
  nota: string | null
}

export function parseCantidadPlanilla(raw: string): CantidadDePlanilla {
  const v = (raw ?? '').trim()
  if (v === '-' || v === '—') {
    return { stock: 0, seControla: false, nota: 'Se pide a pañol; no se cuenta en el laboratorio' }
  }
  if (v === '') {
    return { stock: 0, seControla: false, nota: 'Sin cantidad en la planilla original' }
  }
  const n = Number(v.replace(',', '.'))
  if (!Number.isFinite(n)) {
    return { stock: 0, seControla: false, nota: `Cantidad ilegible en la planilla: "${v}"` }
  }
  return { stock: redondear(n), seControla: true, nota: null }
}

// --- Resumen de un período (declaración de precursores) ----------------------

export type MovimientoDeResumen = {
  tipo: string
  cantidad: number
  stockPrevio: number
  stockNuevo: number
  fecha: Date | string
}

export type ResumenPeriodo = {
  inicial: number
  entradas: number
  salidas: number
  ajustes: number
  final: number
}

function tiempoDe(f: Date | string): number {
  return (typeof f === 'string' ? new Date(f) : f).getTime()
}

/**
 * Lo que hoy la planilla calcula como `DECLARADO − STOCK`, dos números tipeados
 * a mano cuya resta ya dio −1 para el Cloroformo.
 *
 * Se reconstruye hacia atrás desde el saldo de hoy, a propósito: así no depende
 * del orden en que se cargaron los asientos (alguien puede registrar hoy un
 * consumo de la semana pasada) y la identidad
 *
 *     inicial + entradas − salidas + ajustes = final
 *
 * se cumple por construcción en vez de ser una esperanza.
 *
 * `desde` y `hasta` son fechas-calendario a medianoche UTC, igual que el campo
 * `fecha` de los movimientos, así que el tope va incluido.
 */
export function resumenPeriodo(
  stockActual: number,
  movimientos: MovimientoDeResumen[],
  desde: Date,
  hasta: Date,
): ResumenPeriodo {
  const tDesde = desde.getTime()
  const tHasta = hasta.getTime()

  let posteriores = 0
  let entradas = 0
  let salidas = 0
  let ajustes = 0

  for (const m of movimientos) {
    const t = tiempoDe(m.fecha)
    if (t > tHasta) {
      posteriores += deltaDeMovimiento(m)
      continue
    }
    if (t < tDesde) continue
    if (m.tipo === 'ENTRADA') entradas += m.cantidad
    else if (m.tipo === 'CONSUMO' || m.tipo === 'BAJA') salidas += m.cantidad
    else if (m.tipo === 'AJUSTE') ajustes += m.stockNuevo - m.stockPrevio
  }

  const final = redondear(stockActual - posteriores)
  const inicial = redondear(final - (entradas - salidas + ajustes))

  return {
    inicial,
    entradas: redondear(entradas),
    salidas: redondear(salidas),
    ajustes: redondear(ajustes),
    final,
  }
}

// El resumen se calcula en envases; la declaración se presenta en litros o
// kilos. Multiplicar al final y no antes evita arrastrar el redondeo del
// contenido por cada asiento.
export function escalarResumen(r: ResumenPeriodo, factor: number): ResumenPeriodo {
  return {
    inicial: redondear(r.inicial * factor),
    entradas: redondear(r.entradas * factor),
    salidas: redondear(r.salidas * factor),
    ajustes: redondear(r.ajustes * factor),
    final: redondear(r.final * factor),
  }
}

export const RESUMEN_VACIO: ResumenPeriodo = {
  inicial: 0, entradas: 0, salidas: 0, ajustes: 0, final: 0,
}

export function sumarResumenes(a: ResumenPeriodo, b: ResumenPeriodo): ResumenPeriodo {
  return {
    inicial: redondear(a.inicial + b.inicial),
    entradas: redondear(a.entradas + b.entradas),
    salidas: redondear(a.salidas + b.salidas),
    ajustes: redondear(a.ajustes + b.ajustes),
    final: redondear(a.final + b.final),
  }
}
