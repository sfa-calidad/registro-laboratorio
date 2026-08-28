// Declaración de precursores químicos (RENPRE/SEDRONAR) de un período.
//
// Reemplaza la hoja "Sedronar" de la planilla, donde el consumo era
// `DECLARADO − STOCK`: dos números tipeados a mano cuya resta ya dio −1 para el
// Cloroformo, y con una fórmula escrita en la columna equivocada.
//
// Todo se calcula desde los asientos. Es una función pura para que tenga test:
// lo que sale de acá se copia a una declaración jurada.

import {
  RESUMEN_VACIO,
  escalarResumen,
  resumenPeriodo,
  sumarResumenes,
  type MovimientoDeResumen,
  type ResumenPeriodo,
} from '@/lib/inventario'

export type SustanciaDeclarable = {
  id: number
  nombre: string
  gtin: string
  unidad: string
}

export type InsumoDeclarable = {
  id: number
  nombre: string
  presentacion: string
  stock: number
  contenidoPorEnvase: number | null
  sustanciaId: number | null
  movimientos: MovimientoDeResumen[]
}

export type FilaDeInsumo = {
  nombre: string
  presentacion: string
  contenidoPorEnvase: number | null
  envases: ResumenPeriodo
  declarado: ResumenPeriodo | null
}

export type FilaDeclaracion = {
  sustancia: SustanciaDeclarable
  total: ResumenPeriodo
  insumos: FilaDeInsumo[]
  // Insumos enlazados a los que les falta el tamaño del envase: sin ese dato no
  // se puede pasar de envases a litros, así que en vez de sumar algo inventado
  // se avisa y el total queda marcado como incompleto.
  sinContenido: string[]
}

export function declaracionDePeriodo(
  sustancias: SustanciaDeclarable[],
  insumos: InsumoDeclarable[],
  desde: Date,
  hasta: Date,
): FilaDeclaracion[] {
  return sustancias.map((sustancia) => {
    const propios = insumos.filter((i) => i.sustanciaId === sustancia.id)

    const filas: FilaDeInsumo[] = propios.map((i) => {
      const envases = resumenPeriodo(i.stock, i.movimientos, desde, hasta)
      return {
        nombre: i.nombre,
        presentacion: i.presentacion,
        contenidoPorEnvase: i.contenidoPorEnvase,
        envases,
        declarado: i.contenidoPorEnvase !== null ? escalarResumen(envases, i.contenidoPorEnvase) : null,
      }
    })

    const total = filas
      .map((f) => f.declarado)
      .filter((r): r is ResumenPeriodo => r !== null)
      .reduce(sumarResumenes, RESUMEN_VACIO)

    return {
      sustancia,
      total,
      insumos: filas,
      sinContenido: filas.filter((f) => f.declarado === null).map((f) => f.nombre),
    }
  })
}

// El período por defecto: el mes pasado completo, que es el que normalmente se
// declara. Se calcula sobre componentes UTC porque las fechas-calendario se
// guardan a medianoche UTC.
export function mesAnterior(hoy: Date): { desde: string; hasta: string } {
  const anio = hoy.getUTCFullYear()
  const mes = hoy.getUTCMonth()
  const primero = new Date(Date.UTC(anio, mes - 1, 1))
  const ultimo = new Date(Date.UTC(anio, mes, 0))
  return { desde: iso(primero), hasta: iso(ultimo) }
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10)
}
