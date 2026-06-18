import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { getRoleFromRequest } from '@/lib/auth'

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
      h.setHours(23, 59, 59, 999)
      where.fecha.lte = h
    }
  }

  const despachos = await prisma.despacho.findMany({ where, orderBy: { fecha: 'desc' } })

  const headers = ['ID', 'HR/Contrato', 'Fecha', 'Destino', 'Producto', 'Depósito', 'ID Transporte', 'Observación', 'Precinto SFA', 'Precinto Aduana', 'Operador', 'Creado']
  const rows = despachos.map((d) => [
    d.id,
    d.hrContrato,
    format(new Date(d.fecha), 'dd/MM/yyyy', { locale: es }),
    d.destino,
    d.producto,
    d.deposito || '',
    d.idTransporte,
    d.observacion || '',
    d.precintSFA || '',
    d.precintAduana || '',
    d.operador || '',
    format(new Date(d.createdAt), 'dd/MM/yyyy HH:mm', { locale: es }),
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const bom = '﻿'
  return new NextResponse(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="despachos_${format(new Date(), 'yyyyMMdd')}.csv"`,
    },
  })
}
