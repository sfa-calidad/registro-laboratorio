import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'

const schema = z.object({
  nombre: z.string().min(1).optional(),
  orden: z.number().int().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const col = await prisma.columnaKanban.update({ where: { id: Number(id) }, data: parsed.data })
  return NextResponse.json(col)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const count = await prisma.tarea.count({ where: { columnaId: Number(id) } })
  if (count > 0) return NextResponse.json({ error: 'La columna tiene tareas' }, { status: 400 })
  await prisma.columnaKanban.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
