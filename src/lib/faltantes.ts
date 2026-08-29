// Lo que hay que reponer. Es la lista que se le manda a quien compra.
//
// Antes esto era una tarea por insumo, creada sola en cada movimiento. En el
// goteo del día a día funcionaba; en un inventario completo, donde de golpe
// aparecen cincuenta faltantes, el tablero quedaba tapado de tarjetas. Ahora la
// lista se calcula cuando se la pide —siempre al día— y llevarla al tablero es
// una decisión de quien mira, no un automatismo.

import { estadoInsumo, formatearNumero, necesitaReposicion, type EstadoInsumo } from '@/lib/inventario'

export type InsumoFaltante = {
  id: number
  nombre: string
  presentacion: string
  categoria: string
  ubicacion: string | null
  stock: number
  stockMinimo: number | null
  seControla: boolean
}

export type FilaFaltante = InsumoFaltante & { estado: EstadoInsumo }

// Primero lo que está en cero, después lo que está bajo el mínimo, y dentro de
// cada grupo por nombre. Lo que se agotó frena un ensayo hoy; lo que está bajo
// el mínimo lo va a frenar la semana que viene.
const PESO: Partial<Record<EstadoInsumo, number>> = { SIN_STOCK: 0, BAJO_MINIMO: 1 }

export function faltantes(insumos: InsumoFaltante[]): FilaFaltante[] {
  return insumos
    .filter(necesitaReposicion)
    .map((i) => ({ ...i, estado: estadoInsumo(i) }))
    .sort(
      (a, b) =>
        (PESO[a.estado] ?? 9) - (PESO[b.estado] ?? 9) || a.nombre.localeCompare(b.nombre, 'es'),
    )
}

// Cómo se escribe cada renglón en la lista de la tarea del tablero. Lleva las
// dos cifras porque una tarea se lee sin el informe al lado.
export function textoDeChecklist(f: FilaFaltante): string {
  const que = `${f.nombre}${f.presentacion ? ` · ${f.presentacion}` : ''}`
  const cuanto =
    f.stockMinimo !== null
      ? `hay ${formatearNumero(f.stock)}, mínimo ${formatearNumero(f.stockMinimo)}`
      : `sin stock`
  return `${que} — ${cuanto}`
}

export function tituloDeTarea(cantidad: number): string {
  return `Reponer insumos (${cantidad})`
}

export const ETIQUETA_REPOSICION = 'Reposición'
