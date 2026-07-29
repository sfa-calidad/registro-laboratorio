import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'
import { parseId } from '@/lib/utils'
import { conManejoDeErrores } from '@/lib/api'

const schema = z.object({
  hrRemito: z.string().min(1),
  fecha: z.string(),
  origen: z.string().min(1),
  producto1: z.string().min(1),
  producto2: z.string().optional(),
  observacion: z.string().optional(),
  precinto: z.string().optional(),
  operador: z.string().optional(),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const idNum = parseId(id)
  if (idNum === null) return NextResponse.json({ error: 'Id inválido' }, { status: 400 })
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const ingreso = await prisma.ingreso.update({
    where: { id: idNum },
    data: {
      ...parsed.data,
      fecha: new Date(parsed.data.fecha),
      producto2: parsed.data.producto2 || null,
      observacion: parsed.data.observacion || null,
      precinto: parsed.data.precinto || null,
      operador: parsed.data.operador || null,
    },
  })
  return NextResponse.json(ingreso)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const idNum = parseId(id)
  if (idNum === null) return NextResponse.json({ error: 'Id inválido' }, { status: 400 })
  return conManejoDeErrores(async () => {
    await prisma.rotulo.deleteMany({ where: { ingresoId: idNum } })
    await prisma.ingreso.delete({ where: { id: idNum } })
    return NextResponse.json({ ok: true })
  })
}
