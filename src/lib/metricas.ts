import { ZONA_LABORATORIO, hoyEnLaboratorio } from '@/lib/utils'

// Métricas del dashboard. Todo lo que se calcula acá es una función pura sobre
// datos ya traídos: se puede testear sin base y se usa igual en el servidor y
// en el cliente.
//
// Dos clases de fecha conviven en el esquema y NO se agrupan igual:
//  - fechas-calendario (fecha, fechaEnvio, fechaResultado): se guardan como
//    medianoche UTC y se leen por componentes UTC.
//  - timestamps reales (createdAt, completadaAt): son instantes, hay que
//    pasarlos a la zona del laboratorio antes de agrupar, si no un registro de
//    las 22:00 hora argentina cae en el día siguiente.

// ---------------------------------------------------------------- estadística

// Mediana y no promedio: una muestra olvidada tres meses corre el promedio y
// esconde el comportamiento típico.
export function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null
  const orden = [...valores].sort((a, b) => a - b)
  const medio = Math.floor(orden.length / 2)
  return orden.length % 2 === 0 ? (orden[medio - 1] + orden[medio]) / 2 : orden[medio]
}

// Percentil por el método del vecino más cercano: con pocos datos —que es el
// caso de un laboratorio— devuelve siempre un valor observado y no uno
// interpolado que nunca pasó.
export function percentil(valores: number[], p: number): number | null {
  if (valores.length === 0) return null
  const orden = [...valores].sort((a, b) => a - b)
  const indice = Math.min(orden.length - 1, Math.max(0, Math.ceil((p / 100) * orden.length) - 1))
  return orden[indice]
}

// ------------------------------------------------------------------- fechas

const MS_DIA = 86400000

// Días entre dos fechas-calendario. Se normalizan a medianoche UTC para que la
// diferencia sea de días enteros y no dependa de la hora.
export function diasEntre(desde: Date | string, hasta: Date | string): number {
  const a = new Date(desde).setUTCHours(0, 0, 0, 0)
  const b = new Date(hasta).setUTCHours(0, 0, 0, 0)
  return Math.round((b - a) / MS_DIA)
}

// Días transcurridos desde una fecha-calendario hasta hoy en el laboratorio.
export function diasDesde(fecha: Date | string, ahora: Date = new Date()): number {
  return diasEntre(fecha, hoyEnLaboratorio(ahora))
}

// Día del laboratorio de un timestamp real, como YYYY-MM-DD.
export function diaDeTimestamp(ts: Date | string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_LABORATORIO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ts))
}

// Lunes de la semana de una fecha-calendario, como YYYY-MM-DD. Se trabaja en
// UTC porque es donde viven las fechas-calendario.
export function inicioDeSemana(fecha: Date | string): string {
  const d = new Date(new Date(fecha).setUTCHours(0, 0, 0, 0))
  const dow = d.getUTCDay() // 0 = domingo
  const alLunes = dow === 0 ? 6 : dow - 1
  return new Date(d.getTime() - alLunes * MS_DIA).toISOString().slice(0, 10)
}

// Las últimas N semanas terminando en la de hoy, de la más vieja a la más nueva.
export function ultimasSemanas(n: number, ahora: Date = new Date()): string[] {
  const estaSemana = inicioDeSemana(hoyEnLaboratorio(ahora))
  const base = new Date(`${estaSemana}T00:00:00.000Z`).getTime()
  return Array.from({ length: n }, (_, i) => new Date(base - (n - 1 - i) * 7 * MS_DIA).toISOString().slice(0, 10))
}

// "05/05" para el eje de los gráficos.
export function etiquetaSemana(iso: string): string {
  const [, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}

// ------------------------------------------------------- muestras: atrasos

export const TRAMOS_ANTIGUEDAD = [
  { clave: '0-7', etiqueta: 'Hasta 7 días', hasta: 7 },
  { clave: '8-15', etiqueta: '8 a 15 días', hasta: 15 },
  { clave: '16-30', etiqueta: '16 a 30 días', hasta: 30 },
  { clave: '+30', etiqueta: 'Más de 30 días', hasta: Infinity },
] as const

export function tramoAntiguedad(dias: number): string {
  return TRAMOS_ANTIGUEDAD.find((t) => dias <= t.hasta)!.clave
}

// Una muestra enviada a un laboratorio externo que después de este plazo sigue
// sin protocolo está demorada: hay que reclamar.
export const DIAS_DEMORA = 15

export function estaDemorada(
  m: { estado: string; protocolo: string | null; fechaEnvio: Date | string | null },
  ahora: Date = new Date()
): boolean {
  return m.estado === 'ENVIADA' && !m.protocolo && !!m.fechaEnvio && diasDesde(m.fechaEnvio, ahora) > DIAS_DEMORA
}

// ------------------------------------------------------- muestras: tiempos

export type MuestraParaMetricas = {
  fecha: Date | string
  fechaResultado: Date | string | null
  estado: string
  laboratorio: string | null
}

export type TiemposDeCierre = {
  medianaDias: number | null
  p90Dias: number | null
  cerradas: number // muestras en CON_RESULTADO
  medidas: number // …de las cuales tienen fechaResultado
}

// Días desde que se identifica la muestra hasta que tiene resultado.
//
// `cerradas` y `medidas` no son lo mismo a propósito: una muestra puede quedar
// en CON_RESULTADO por tener resultado o protocolo sin fecha, y esas no se
// pueden medir. Mostrar las dos deja claro sobre cuánto se calculó la mediana;
// sin eso el número no se puede interpretar.
export function tiemposDeCierre(muestras: MuestraParaMetricas[]): TiemposDeCierre {
  const cerradas = muestras.filter((m) => m.estado === 'CON_RESULTADO')
  const dias = cerradas
    .filter((m) => m.fechaResultado)
    .map((m) => diasEntre(m.fecha, m.fechaResultado!))
    .filter((d) => d >= 0) // una fecha de resultado anterior a la de toma es un error de carga
  return {
    medianaDias: mediana(dias),
    p90Dias: percentil(dias, 90),
    cerradas: cerradas.length,
    medidas: dias.length,
  }
}

// ------------------------------------------------------------- atribución

// Cuatro de las formas de atribuir trabajo a una persona son texto y no una
// relación real, y todas admiten vacío. La cobertura dice sobre qué porcentaje
// de los registros se puede comparar gente: si es baja, comparar es ruido.
export function cobertura(valores: (string | null | undefined)[]): { conDato: number; total: number; porcentaje: number } {
  const total = valores.length
  const conDato = valores.filter((v) => !!v && v.trim() !== '').length
  return { conDato, total, porcentaje: total === 0 ? 0 : Math.round((conDato / total) * 100) }
}

export const SIN_ASIGNAR = 'Sin asignar'

// Cuenta por nombre dejando explícito lo que no tiene nadie cargado, en vez de
// descartarlo en silencio.
export function contarPorNombre(valores: (string | null | undefined)[]): Map<string, number> {
  const cuenta = new Map<string, number>()
  for (const v of valores) {
    const clave = v && v.trim() !== '' ? v.trim() : SIN_ASIGNAR
    cuenta.set(clave, (cuenta.get(clave) ?? 0) + 1)
  }
  return cuenta
}
