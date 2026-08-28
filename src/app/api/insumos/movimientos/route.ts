import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'
import { conManejoDeErrores } from '@/lib/api'
import { hoyEnLaboratorio } from '@/lib/utils'
import {
  InsumoInexistente,
  StockInsuficiente,
  fechaCalendario,
  registrarMovimiento,
} from '@/lib/movimientosInsumo'

const schema = z.object({
  insumoId: z.number().int().positive(),
  tipo: z.enum(['ENTRADA', 'CONSUMO', 'BAJA', 'AJUSTE']),
  cantidad: z.number().nonnegative(),
  motivo: z.string().optional(),
  analista: z.string().optional(),
  fecha: z.string().optional(),
})

export const dynamic = 'force-dynamic'

// El historial de un insumo se pide al abrirlo y no viene con el listado: son
// 187 insumos y traer todos los asientos de todos para mostrar uno sería mandar
// al navegador el libro entero.
export async function GET(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const insumoId = Number(req.nextUrl.searchParams.get('insumoId'))
  if (!Number.isInteger(insumoId) || insumoId <= 0) {
    return NextResponse.json({ error: 'Id inválido' }, { status: 400 })
  }
  const movimientos = await prisma.movimientoInsumo.findMany({
    where: { insumoId },
    orderBy: { id: 'desc' },
    take: 200,
  })
  return NextResponse.json(movimientos)
}

export async function POST(req: NextRequest) {
  // Registrar lo que se usó es el día a día del laboratorio: lo hace cualquiera
  // que esté logueado. El ajuste, que corrige el número en vez de explicarlo,
  // queda para el supervisor y para el recuento.
  const role = getRoleFromRequest(req)
  if (!role) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const d = parsed.data

  if (d.tipo === 'AJUSTE' && role !== 'supervisor') {
    return NextResponse.json(
      { error: 'Solo el supervisor puede ajustar el stock a mano. Para corregirlo, hacé un recuento.' },
      { status: 403 },
    )
  }
  if (d.tipo !== 'AJUSTE' && d.cantidad <= 0) {
    return NextResponse.json({ error: 'La cantidad tiene que ser mayor que cero' }, { status: 400 })
  }
  if (d.tipo === 'AJUSTE' && !d.motivo?.trim()) {
    // Un ajuste sin explicación es exactamente lo que hace la planilla cuando
    // alguien pisa la celda.
    return NextResponse.json({ error: 'El ajuste necesita un motivo' }, { status: 400 })
  }

  return conManejoDeErrores(async () => {
    try {
      const movimiento = await prisma.$transaction(
        (tx) =>
          registrarMovimiento(tx, {
            insumoId: d.insumoId,
            tipo: d.tipo,
            cantidad: d.cantidad,
            motivo: d.motivo,
            analista: d.analista,
            fecha: fechaCalendario(d.fecha, hoyEnLaboratorio()),
          }),
        // Leer el stock y escribirlo son dos pasos: sin este aislamiento, dos
        // consumos simultáneos del mismo frasco leen lo mismo y uno se pierde.
        { isolationLevel: 'Serializable' },
      )
      return NextResponse.json(movimiento, { status: 201 })
    } catch (e) {
      if (e instanceof StockInsuficiente) {
        return NextResponse.json({ error: e.message }, { status: 409 })
      }
      if (e instanceof InsumoInexistente) {
        return NextResponse.json({ error: 'No se encontró el insumo' }, { status: 404 })
      }
      throw e
    }
  })
}
