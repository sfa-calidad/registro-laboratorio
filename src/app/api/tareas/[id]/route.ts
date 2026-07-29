import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'
import { parseId } from '@/lib/utils'
import { conManejoDeErrores } from '@/lib/api'

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
  checklist: z.string().nullable().optional(),
  mostrarChecklist: z.boolean().optional(),
})

const include = { columna: true, firma1: true, firma2: true }

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(req)
  if (!role) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const idNum = parseId(id)
  if (idNum === null) return NextResponse.json({ error: 'Id inválido' }, { status: 400 })
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  if (parsed.data.archivadaAt !== undefined && role !== 'supervisor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  if (parsed.data.completadaAt) {
    const actual = await prisma.tarea.findUnique({ where: { id: idNum }, select: { analistaId1: true } })
    const firmaFinal = parsed.data.analistaId1 !== undefined ? parsed.data.analistaId1 : actual?.analistaId1
    if (!firmaFinal) {
      return NextResponse.json({ error: 'La tarea debe tener al menos una firma antes de marcarse como completada' }, { status: 400 })
    }
  }

  const { fechaVencimiento, completadaAt, archivadaAt, ...rest } = parsed.data
  const tarea = await prisma.tarea.update({
    where: { id: idNum },
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return conManejoDeErrores(async () => {
    // El botón de eliminar ya estaba oculto para el analista en el tablero, pero
    // la API lo aceptaba igual. Archivar (que es reversible) sí estaba protegido;
    // eliminar (que no lo es) no.
    if (getRoleFromRequest(req) !== 'supervisor') {
      return NextResponse.json({ error: 'Solo el supervisor puede eliminar tareas' }, { status: 403 })
    }
    const { id } = await params
    const idNum = parseId(id)
    if (idNum === null) return NextResponse.json({ error: 'Id inválido' }, { status: 400 })
    await prisma.tarea.delete({ where: { id: idNum } })
    return NextResponse.json({ ok: true })
  })
}
