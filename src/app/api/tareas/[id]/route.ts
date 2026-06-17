import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'

const schema = z.object({
  titulo: z.string().min(1).optional(),
  descripcion: z.string().nullable().optional(),
  columnaId: z.number().int().optional(),
  analistaId1: z.number().int().nullable().optional(),
  analistaId2: z.number().int().nullable().optional(),
  prioridad: z.enum(['alta', 'media', 'baja']).nullable().optional(),
  fechaVencimiento: z.string().nullable().optional(),
  completadaAt: z.string().nullable().optional(),
  etiquetas: z.string().nullable().optional(),
  notas: z.string().nullable().optional(),
  archivadaAt: z.string().nullable().optional(),
})

const include = { columna: true, firma1: true, firma2: true }

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  if (parsed.data.archivadaAt !== undefined) {
    const role = getRoleFromRequest(req)
    if (role !== 'supervisor') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { fechaVencimiento, completadaAt, archivadaAt, ...rest } = parsed.data
  const tarea = await prisma.tarea.update({
    where: { id: Number(id) },
    data: {
      ...rest,
      ...(fechaVencimiento !== undefined ? { fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null } : {}),
      ...(completadaAt !== undefined ? { completadaAt: completadaAt ? new Date(completadaAt) : null } : {}),
      ...(archivadaAt !== undefined ? { archivadaAt: archivadaAt ? new Date(archivadaAt) : null } : {}),
    },
    include,
  })
  return NextResponse.json(tarea)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.tarea.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
