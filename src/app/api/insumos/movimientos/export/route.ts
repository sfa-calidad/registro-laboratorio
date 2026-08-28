import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { getRoleFromRequest } from '@/lib/auth'
import { formatDateOnly } from '@/lib/utils'
import { aCsv } from '@/lib/csv'

export const dynamic = 'force-dynamic'

// El libro de movimientos: lo que la planilla nunca tuvo. Cada línea dice qué
// pasó, cuánto había antes y cuánto quedó.
export async function GET(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')

  const where: { fecha?: { gte?: Date; lte?: Date } } = {}
  if (desde || hasta) {
    where.fecha = {}
    if (desde) where.fecha.gte = new Date(`${desde}T00:00:00.000Z`)
    // Las fechas-calendario se guardan a medianoche UTC, así que el tope del
    // rango es esa misma medianoche y va incluido.
    if (hasta) where.fecha.lte = new Date(`${hasta}T00:00:00.000Z`)
  }

  const movimientos = await prisma.movimientoInsumo.findMany({
    where,
    include: { insumo: { include: { sustancia: true } } },
    orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
  })

  const headers = [
    'Fecha', 'Insumo', 'Presentación', 'Categoría', 'Ubicación', 'Movimiento',
    'Cantidad', 'Stock anterior', 'Stock nuevo', 'Motivo', 'Analista',
    'Sustancia controlada', 'Registrado',
  ]
  const rows = movimientos.map((m) => [
    formatDateOnly(m.fecha),
    m.insumo.nombre,
    m.insumo.presentacion,
    m.insumo.categoria,
    m.insumo.ubicacion || '',
    m.tipo,
    m.cantidad,
    m.stockPrevio,
    m.stockNuevo,
    m.motivo || '',
    m.analista || '',
    m.insumo.sustancia?.nombre || '',
    format(new Date(m.createdAt), 'dd/MM/yyyy HH:mm'),
  ])

  return new NextResponse(aCsv(headers, rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="movimientos_insumos_${format(new Date(), 'yyyyMMdd')}.csv"`,
    },
  })
}
