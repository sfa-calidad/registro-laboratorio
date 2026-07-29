import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { getRoleFromRequest } from '@/lib/auth'
import { formatDateOnly } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')

  const where: { fecha?: { gte?: Date; lte?: Date } } = {}
  if (desde || hasta) {
    where.fecha = {}
    if (desde) where.fecha.gte = new Date(desde)
    if (hasta) {
      const h = new Date(hasta)
      // setUTCHours y no setHours: `fecha` se guarda como medianoche UTC, y con
      // horas locales el tope del rango caía en otro día según la zona del
      // proceso (arrastraba registros del día siguiente).
      h.setUTCHours(23, 59, 59, 999)
      where.fecha.lte = h
    }
  }

  const analisis = await prisma.analisisTanque.findMany({
    where,
    include: { resultados: { include: { parametro: true } } },
    orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
  })

  // Una columna por parámetro que aparezca en el rango exportado, en el orden
  // del catálogo. El encabezado es la abreviatura (o nombre + método).
  const parametros = new Map<number, { etiqueta: string; orden: number }>()
  for (const a of analisis) {
    for (const r of a.resultados) {
      if (!parametros.has(r.parametroId)) {
        const p = r.parametro
        parametros.set(r.parametroId, {
          etiqueta: p.abreviatura || (p.metodo ? `${p.nombre} (${p.metodo})` : p.nombre),
          orden: p.orden,
        })
      }
    }
  }
  const columnasParam = [...parametros.entries()].sort((a, b) => a[1].orden - b[1].orden)

  const headers = [
    'ID', 'Fecha', 'Producto', 'Tanques', 'Altura (m)', 'Medida desde',
    'Conjunto HA', 'Analista', 'Comentario',
    ...columnasParam.map(([, c]) => c.etiqueta),
    'Creado',
  ]
  const rows = analisis.map((a) => {
    const porParametro = new Map(a.resultados.map((r) => [r.parametroId, r]))
    return [
      a.id,
      formatDateOnly(a.fecha),
      a.producto,
      a.tanques,
      a.alturaM ?? '',
      a.referencia || '',
      a.conjuntoHaciaArriba ? 'Sí' : '',
      a.analista || '',
      a.comentario || '',
      ...columnasParam.map(([parametroId]) => {
        const r = porParametro.get(parametroId)
        return r ? (r.valorTexto ?? r.valor ?? '') : ''
      }),
      format(new Date(a.createdAt), 'dd/MM/yyyy HH:mm'),
    ]
  })

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const bom = '﻿' // UTF-8 BOM para Excel
  return new NextResponse(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="analisis_tanques_${format(new Date(), 'yyyyMMdd')}.csv"`,
    },
  })
}
