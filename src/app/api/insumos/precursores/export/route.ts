import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { getRoleFromRequest } from '@/lib/auth'
import { hoyEnLaboratorio } from '@/lib/utils'
import { declaracionDePeriodo, mesAnterior } from '@/lib/precursores'
import { aCsv } from '@/lib/csv'

export const dynamic = 'force-dynamic'

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/

export async function GET(req: NextRequest) {
  if (getRoleFromRequest(req) !== 'supervisor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const porDefecto = mesAnterior(hoyEnLaboratorio())
  const desdeStr = ES_FECHA.test(searchParams.get('desde') || '') ? searchParams.get('desde')! : porDefecto.desde
  const hastaStr = ES_FECHA.test(searchParams.get('hasta') || '') ? searchParams.get('hasta')! : porDefecto.hasta

  const [sustancias, insumos] = await Promise.all([
    prisma.sustanciaControlada.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } }),
    prisma.insumo.findMany({
      where: { sustanciaId: { not: null } },
      include: {
        movimientos: {
          select: { tipo: true, cantidad: true, stockPrevio: true, stockNuevo: true, fecha: true },
        },
      },
    }),
  ])

  const filas = declaracionDePeriodo(
    sustancias,
    insumos,
    new Date(`${desdeStr}T00:00:00.000Z`),
    new Date(`${hastaStr}T00:00:00.000Z`),
  )

  const headers = [
    'Sustancia', 'GTIN', 'Unidad', 'Stock inicial', 'Entradas', 'Salidas',
    'Ajustes', 'Stock final', 'Insumos enlazados', 'Sin tamaño de envase',
  ]
  const rows = filas.map((f) => [
    f.sustancia.nombre,
    f.sustancia.gtin,
    f.sustancia.unidad,
    f.total.inicial,
    f.total.entradas,
    f.total.salidas,
    f.total.ajustes,
    f.total.final,
    f.insumos.map((i) => i.nombre).join(' | '),
    f.sinContenido.join(' | '),
  ])

  return new NextResponse(aCsv(headers, rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="precursores_${desdeStr}_${hastaStr}_${format(new Date(), 'yyyyMMdd')}.csv"`,
    },
  })
}
