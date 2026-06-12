import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

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
  const { id } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const despacho = await prisma.despacho.update({
    where: { id: Number(id) },
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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.rotulo.deleteMany({ where: { despachoId: Number(id) } })
  await prisma.despacho.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
