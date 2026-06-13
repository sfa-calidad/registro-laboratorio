import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  nombre: z.string().min(1).optional(),
  apellido: z.string().min(1).optional(),
  activo: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const analista = await prisma.analista.update({
    where: { id: Number(id) },
    data: parsed.data,
  })
  return NextResponse.json(analista)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.analista.update({ where: { id: Number(id) }, data: { activo: false } })
  return NextResponse.json({ ok: true })
}
