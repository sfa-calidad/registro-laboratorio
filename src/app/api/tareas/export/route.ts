import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { getRoleFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tareas = await prisma.tarea.findMany({
    include: { columna: true, firma1: true, firma2: true },
    orderBy: { createdAt: 'desc' },
  })

  const headers = ['ID', 'Título', 'Descripción', 'Columna', 'Prioridad', 'Vencimiento', 'Firma 1', 'Firma 2', 'Creado por', 'Completada', 'Creada']
  const rows = tareas.map((t) => [
    t.id,
    t.titulo,
    t.descripcion || '',
    t.columna.nombre,
    t.prioridad || '',
    t.fechaVencimiento ? format(new Date(t.fechaVencimiento), 'dd/MM/yyyy', { locale: es }) : '',
    t.firma1 ? `${t.firma1.nombre} ${t.firma1.apellido}` : '',
    t.firma2 ? `${t.firma2.nombre} ${t.firma2.apellido}` : '',
    t.creadoPor,
    t.completadaAt ? format(new Date(t.completadaAt), 'dd/MM/yyyy HH:mm', { locale: es }) : '',
    format(new Date(t.createdAt), 'dd/MM/yyyy HH:mm', { locale: es }),
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const bom = '﻿'
  return new NextResponse(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tareas_${format(new Date(), 'yyyyMMdd')}.csv"`,
    },
  })
}
