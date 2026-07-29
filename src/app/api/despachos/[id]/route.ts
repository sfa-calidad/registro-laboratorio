import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'
import { parseId } from '@/lib/utils'
import { conManejoDeErrores } from '@/lib/api'

const schema = z.object({
  hrContrato: z.string().min(1),
  fecha: z.string(),
  destino: z.string().min(1),
  producto: z.string().min(1),
  deposito: z.string().optional(),
  idTransporte: z.string().min(1),
  observacion: z.string().optional(),
  precintSFA: z.string().optional(),
  precintAduana: z.string().optional(),
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

  const despacho = await prisma.despacho.update({
    where: { id: idNum },
    data: {
      ...parsed.data,
      fecha: new Date(parsed.data.fecha),
      deposito: parsed.data.deposito || null,
      observacion: parsed.data.observacion || null,
      precintSFA: parsed.data.precintSFA || null,
      precintAduana: parsed.data.precintAduana || null,
      operador: parsed.data.operador || null,
    },
  })
  return NextResponse.json(despacho)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const idNum = parseId(id)
  if (idNum === null) return NextResponse.json({ error: 'Id inválido' }, { status: 400 })
  return conManejoDeErrores(async () => {
    await prisma.rotulo.deleteMany({ where: { despachoId: idNum } })
    await prisma.despacho.delete({ where: { id: idNum } })
    return NextResponse.json({ ok: true })
  })
}
