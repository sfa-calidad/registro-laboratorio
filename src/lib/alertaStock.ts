import { prisma } from '@/lib/prisma'
import { formatearNumero, necesitaReposicion } from '@/lib/inventario'

/**
 * Cuando un insumo queda por debajo de su mínimo, aparece sola una tarea
 * "Reponer ..." en el tablero.
 *
 * Va al tablero y no a un aviso propio porque el tablero es lo que el
 * laboratorio mira todos los días, y porque quien compra ya trabaja ahí. Un
 * cartel dentro de la pantalla de insumos solo lo ve quien entra a insumos, que
 * es justamente el que ya se dio cuenta.
 */

export const ETIQUETA_REPOSICION = 'Reposición'

function tituloDe(insumo: { nombre: string; presentacion: string }): string {
  return `Reponer ${insumo.nombre}${insumo.presentacion ? ` · ${insumo.presentacion}` : ''}`
}

/**
 * Crea la tarea si hace falta. Devuelve el título si la creó, o null.
 *
 * Se llama DESPUÉS de que el movimiento quedó guardado y nunca dentro de su
 * transacción: si el tablero fallara, lo que no puede perderse es el consumo.
 * Por eso también se traga sus propios errores.
 */
export async function avisarSiFaltaStock(insumoId: number): Promise<string | null> {
  try {
    const insumo = await prisma.insumo.findUnique({ where: { id: insumoId } })
    if (!insumo || !insumo.activo) return null
    // Sin mínimo cargado no hay nada que avisar hasta que llegue a cero, y lo
    // que no se cuenta acá (se pide a pañol) no avisa nunca.
    if (!necesitaReposicion(insumo)) return null

    // Una sola tarea abierta por insumo: si no, cada consumo del mismo frasco
    // agregaría otra igual y el tablero se llenaría de ruido.
    const yaAvisada = await prisma.tarea.findFirst({
      where: { insumoId, completadaAt: null, archivadaAt: null },
    })
    if (yaAvisada) return null

    const columna = await prisma.columnaKanban.findFirst({ orderBy: { orden: 'asc' } })
    if (!columna) return null

    const detalle = [
      `Stock: ${formatearNumero(insumo.stock)}`,
      insumo.stockMinimo !== null ? `mínimo: ${formatearNumero(insumo.stockMinimo)}` : null,
      insumo.ubicacion,
    ]
      .filter(Boolean)
      .join(' · ')

    await prisma.tarea.create({
      data: {
        titulo: tituloDe(insumo),
        descripcion: `Se generó sola: el stock quedó en el mínimo o por debajo.\n${detalle}`,
        columnaId: columna.id,
        creadoPor: 'Inventario',
        etiquetas: ETIQUETA_REPOSICION,
        insumoId: insumo.id,
        // Arriba de todo en la columna: es lo que frena un ensayo.
        orden: -1,
      },
    })
    return tituloDe(insumo)
  } catch {
    // El movimiento ya está guardado; que el tablero falle no puede hacerlo
    // fallar a él ni bloquear a quien está cargando.
    return null
  }
}

// Varios insumos de una (el recuento ajusta muchos a la vez).
export async function avisarSiFaltaStockDeVarios(insumoIds: number[]): Promise<string[]> {
  const avisos: string[] = []
  for (const id of [...new Set(insumoIds)]) {
    const titulo = await avisarSiFaltaStock(id)
    if (titulo) avisos.push(titulo)
  }
  return avisos
}
