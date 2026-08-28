import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { getRoleFromRequest } from '@/lib/auth'
import { formatDateOnly } from '@/lib/utils'
import { ETIQUETA_ESTADO, estadoInsumo } from '@/lib/inventario'
import { aCsv } from '@/lib/csv'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const categoria = searchParams.get('categoria')

  const insumos = await prisma.insumo.findMany({
    where: { activo: true, ...(categoria ? { categoria } : {}) },
    include: { sustancia: true },
    orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
  })

  const headers = [
    'Nombre', 'Categoría', 'Presentación', 'Ubicación', 'Stock', 'Stock mínimo',
    'Estado', 'Se cuenta', 'Contenido por envase', 'Unidad', 'Sustancia controlada',
    'GTIN', 'Último recuento', 'Observación',
  ]
  const rows = insumos.map((i) => [
    i.nombre,
    i.categoria,
    i.presentacion,
    i.ubicacion || '',
    i.stock,
    i.stockMinimo ?? '',
    ETIQUETA_ESTADO[estadoInsumo(i)],
    i.seControla ? 'Sí' : 'No',
    i.contenidoPorEnvase ?? '',
    i.unidadContenido || '',
    i.sustancia?.nombre || '',
    i.sustancia?.gtin || '',
    i.ultimoRecuento ? formatDateOnly(i.ultimoRecuento) : '',
    i.observacion || '',
  ])

  return new NextResponse(aCsv(headers, rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="insumos_${format(new Date(), 'yyyyMMdd')}.csv"`,
    },
  })
}
