import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { getRoleFromRequest } from '@/lib/auth'
import { ETIQUETA_ESTADO } from '@/lib/inventario'
import { faltantes } from '@/lib/faltantes'
import { aCsv } from '@/lib/csv'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const insumos = await prisma.insumo.findMany({
    where: { activo: true, seControla: true },
    select: {
      id: true, nombre: true, presentacion: true, categoria: true,
      ubicacion: true, stock: true, stockMinimo: true, seControla: true,
    },
  })

  const headers = ['Insumo', 'Presentación', 'Categoría', 'Ubicación', 'Hay', 'Mínimo', 'Estado']
  const rows = faltantes(insumos).map((f) => [
    f.nombre,
    f.presentacion,
    f.categoria,
    f.ubicacion || '',
    f.stock,
    f.stockMinimo ?? '',
    ETIQUETA_ESTADO[f.estado],
  ])

  return new NextResponse(aCsv(headers, rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="insumos_a_reponer_${format(new Date(), 'yyyyMMdd')}.csv"`,
    },
  })
}
