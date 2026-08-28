import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'
import { conManejoDeErrores } from '@/lib/api'
import { hoyEnLaboratorio, formatDateOnly } from '@/lib/utils'
import { redondear } from '@/lib/inventario'
import { fechaCalendario, registrarMovimiento } from '@/lib/movimientosInsumo'
import { avisarSiFaltaStockDeVarios } from '@/lib/alertaStock'

const schema = z.object({
  ubicacion: z.string().min(1),
  analista: z.string().optional(),
  fecha: z.string().optional(),
  // Solo llegan las filas que se contaron: una fila en blanco no es un cero, es
  // "no lo miré", y no tiene que mover nada.
  conteos: z
    .array(z.object({ insumoId: z.number().int().positive(), contado: z.number().nonnegative() }))
    .min(1),
})

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Contar es trabajo de laboratorio, no de catálogo: lo hace cualquiera que
  // esté logueado. El ajuste que sale del recuento queda explicado por el
  // recuento mismo, así que no necesita ser supervisor.
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const d = parsed.data

  const fecha = fechaCalendario(d.fecha, hoyEnLaboratorio())
  const motivo = `Recuento físico · ${d.ubicacion} · ${formatDateOnly(fecha)}`

  return conManejoDeErrores(async () => {
    const diferencias: { nombre: string; esperado: number; contado: number }[] = []

    await prisma.$transaction(
      async (tx) => {
        for (const c of d.conteos) {
          const insumo = await tx.insumo.findUnique({ where: { id: c.insumoId } })
          if (!insumo || !insumo.activo) continue

          if (redondear(insumo.stock) !== redondear(c.contado)) {
            await registrarMovimiento(tx, {
              insumoId: insumo.id,
              tipo: 'AJUSTE',
              cantidad: c.contado,
              motivo,
              analista: d.analista,
              fecha,
            })
            diferencias.push({ nombre: insumo.nombre, esperado: insumo.stock, contado: c.contado })
          }

          // Se marca aunque no haya habido diferencia: "lo contamos y estaba
          // bien" también es información, y sin esto no quedaría en ningún lado
          // —que es justo el problema de la planilla—.
          //
          // Contar una cantidad de algo que no se seguía lo pone bajo control
          // desde ahora: si sabés cuántos hay, tiene sentido que avise cuando se
          // acaben. Contar cero, en cambio, no lo activa: pasaría a gritar
          // "sin stock" un ítem que a lo mejor solo se pide a pañol.
          await tx.insumo.update({
            where: { id: insumo.id },
            data: {
              ultimoRecuento: fecha,
              seControla: insumo.seControla || c.contado > 0,
            },
          })
        }
      },
      // Un recuento entero es un solo acto: o entra completo o no entra.
      { isolationLevel: 'Serializable', timeout: 20000, maxWait: 10000 },
    )

    // Después de cerrar la transacción: un recuento puede dejar varios insumos
    // bajo el mínimo, y el tablero se entera de todos.
    const avisos = await avisarSiFaltaStockDeVarios(d.conteos.map((c) => c.insumoId))

    return NextResponse.json({
      contados: d.conteos.length,
      sinDiferencia: d.conteos.length - diferencias.length,
      diferencias,
      avisos,
    })
  })
}
