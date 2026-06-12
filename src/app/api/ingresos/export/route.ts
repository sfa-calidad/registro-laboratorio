import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export async function GET() {
  const ingresos = await prisma.ingreso.findMany({ orderBy: { fecha: 'desc' } })

  const headers = ['ID', 'HR/Remito', 'Fecha', 'Origen', 'Producto 1', 'Producto 2', 'Observación', 'Precinto', 'Operador', 'Creado']
  const rows = ingresos.map((i) => [
    i.id,
    i.hrRemito,
    format(new Date(i.fecha), 'dd/MM/yyyy', { locale: es }),
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
