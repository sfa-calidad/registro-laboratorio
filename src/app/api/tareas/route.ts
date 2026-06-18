import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const schema = z.object({
  titulo: z.string().min(1),
  descripcion: z.string().nullable().optional(),
  columnaId: z.number().int(),
  analistaId1: z.number().int().nullable().optional(),
  analistaId2: z.number().int().nullable().optional(),
  prioridad: z.enum(['alta', 'media', 'baja']).nullable().optional(),
  fechaVencimiento: z.string().optional().nullable(),
  etiquetas: z.string().nullable().optional(),
  notas: z.string().nullable().optional(),
  checklist: z.string().nullable().optional(),
  mostrarChecklist: z.boolean().optional(),
})

const include = {
  columna: true,
  firma1: true,
  firma2: true,
}

export async function GET(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const archivadas = req.nextUrl.searchParams.get('archivadas') === '1'
  const tareas = await prisma.tarea.findMany({
    where: { archivadaAt: archivadas ? { not: null } : null },
    include,
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(tareas)
}

export async function POST(req: NextRequest) {
  const role = getRoleFromRequest(req)
  if (!role) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const { fechaVencimiento, ...rest } = parsed.data
  const tarea = await prisma.tarea.create({
    data: {
      ...rest,
      creadoPor: role,
      fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
    },
    include,
  })
  return NextResponse.json(tarea, { status: 201 })
}
