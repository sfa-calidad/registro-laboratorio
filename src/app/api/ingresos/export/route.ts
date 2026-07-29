import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
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

  const ingresos = await prisma.ingreso.findMany({ where, orderBy: { fecha: 'desc' } })

  const headers = ['ID', 'HR/Remito', 'Fecha', 'Origen', 'Producto 1', 'Producto 2', 'Observación', 'Precinto', 'Operador', 'Creado']
  const rows = ingresos.map((i) => [
    i.id,
    i.hrRemito,
    formatDateOnly(i.fecha),
    i.origen,
    i.producto1,
    i.producto2 || '',
    i.observacion || '',
    i.precinto || '',
    i.operador || '',
    format(new Date(i.createdAt), 'dd/MM/yyyy HH:mm', { locale: es }),
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const bom = '﻿' // UTF-8 BOM for Excel
  return new NextResponse(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ingresos_${format(new Date(), 'yyyyMMdd')}.csv"`,
    },
  })
}
