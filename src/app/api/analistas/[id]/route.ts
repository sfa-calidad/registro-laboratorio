import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'
import { parseId } from '@/lib/utils'
import { conManejoDeErrores } from '@/lib/api'

const schema = z.object({
  nombre: z.string().min(1).optional(),
  apellido: z.string().min(1).optional(),
  activo: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (getRoleFromRequest(req) !== 'supervisor') return NextResponse.json({ error: 'Solo el supervisor puede gestionar analistas' }, { status: 403 })
  const { id } = await params
  const idNum = parseId(id)
  if (idNum === null) return NextResponse.json({ error: 'Id inválido' }, { status: 400 })
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const analista = await prisma.analista.update({
    where: { id: idNum },
    data: parsed.data,
  })
  return NextResponse.json(analista)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (getRoleFromRequest(req) !== 'supervisor') return NextResponse.json({ error: 'Solo el supervisor puede gestionar analistas' }, { status: 403 })
  const { id } = await params
  const idNum = parseId(id)
  if (idNum === null) return NextResponse.json({ error: 'Id inválido' }, { status: 400 })
  return conManejoDeErrores(async () => {
    await prisma.analista.update({ where: { id: idNum }, data: { activo: false } })
    return NextResponse.json({ ok: true })
  })
}
