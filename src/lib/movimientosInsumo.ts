import { Prisma } from '@prisma/client'
import { alcanzaElStock, aplicarMovimiento, type TipoMovimiento } from '@/lib/inventario'

// El alta de un movimiento es lo único que puede tocar el stock. Vive acá y no
// en cada route para que el recuento —que registra muchos ajustes de una— use
// exactamente la misma regla que el consumo de a uno.

export class InsumoInexistente extends Error {}

export class StockInsuficiente extends Error {
  constructor(public nombre: string, public disponible: number, public pedido: number) {
    super(
      `No alcanza el stock de ${nombre}: hay ${disponible} y querés descontar ${pedido}. ` +
        'Si el número guardado está mal, corregilo con un ajuste.',
    )
  }
}

export type DatosMovimiento = {
  insumoId: number
  tipo: TipoMovimiento
  cantidad: number
  motivo?: string | null
  analista?: string | null
  fecha: Date
}

/**
 * Registra un movimiento y deja el stock en su nuevo valor, dentro de la misma
 * transacción que lo llama.
 *
 * Va siempre en una transacción `Serializable` (ver quienes lo llaman): sin eso,
 * dos analistas descontando el mismo frasco al mismo tiempo leen 5 los dos y
 * escriben 4, y se pierde un consumo sin que nadie se entere. Es el error que
 * hoy comete la planilla compartida.
 */
export async function registrarMovimiento(tx: Prisma.TransactionClient, datos: DatosMovimiento) {
  const insumo = await tx.insumo.findUnique({ where: { id: datos.insumoId } })
  if (!insumo || !insumo.activo) {
    throw new InsumoInexistente(`No existe el insumo ${datos.insumoId}`)
  }
  if (!alcanzaElStock(insumo.stock, datos.tipo, datos.cantidad)) {
    throw new StockInsuficiente(insumo.nombre, insumo.stock, datos.cantidad)
  }

  const stockNuevo = aplicarMovimiento(insumo.stock, datos.tipo, datos.cantidad)

  await tx.insumo.update({ where: { id: insumo.id }, data: { stock: stockNuevo } })

  return tx.movimientoInsumo.create({
    data: {
      insumoId: insumo.id,
      tipo: datos.tipo,
      cantidad: datos.cantidad,
      stockPrevio: insumo.stock,
      stockNuevo,
      motivo: datos.motivo?.trim() || null,
      analista: datos.analista?.trim() || null,
      fecha: datos.fecha,
    },
  })
}

// Las fechas-calendario se guardan como medianoche UTC (ver src/lib/utils.ts).
export function fechaCalendario(iso: string | undefined, porDefecto: Date): Date {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return porDefecto
  return new Date(`${iso}T00:00:00.000Z`)
}
