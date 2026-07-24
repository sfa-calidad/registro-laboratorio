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
      h.setHours(23, 59, 59, 999)
      where.fecha.lte = h
    }
  }

  const muestras = await prisma.muestra.findMany({
    where,
    include: { ensayos: { include: { parametro: true } } },
    orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
  })

  const headers = [
    'Número', 'Fecha', 'Producto', 'Detalle', 'Motivo', 'Tipo de origen',
    'Identificación origen', 'Lugar de muestreo', 'Contacto', 'Solicitado por',
    'Remito', 'Envase', 'Laboratorio', 'Estado', 'Fecha envío', 'AWB',
    'Protocolo', 'Fecha resultado', 'Resultado', 'Ensayos', 'Observación',
    'Cargado por', 'Creado',
  ]
  const rows = muestras.map((m) => [
    m.numero,
    formatDateOnly(m.fecha),
    m.producto,
    m.detalle || '',
    m.motivo || '',
    m.tipoOrigen || '',
    m.identificacionOrigen || '',
    m.lugarMuestreo || '',
    m.contacto || '',
    m.solicitadoPor || '',
    m.remito || '',
    m.envase || '',
    m.laboratorio || '',
    m.estado,
    m.fechaEnvio ? formatDateOnly(m.fechaEnvio) : '',
    m.awb || '',
    m.protocolo || '',
    m.fechaResultado ? formatDateOnly(m.fechaResultado) : '',
    m.resultado || '',
    m.ensayos.map((e) => e.parametro ? (e.parametro.abreviatura || e.parametro.nombre) : e.libre).filter(Boolean).join(' | '),
    m.observacion || '',
    m.cargadoPor || '',
    format(new Date(m.createdAt), 'dd/MM/yyyy HH:mm'),
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const bom = '﻿' // UTF-8 BOM para Excel
  return new NextResponse(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="muestras_${format(new Date(), 'yyyyMMdd')}.csv"`,
    },
  })
}
