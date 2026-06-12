import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  tipo: z.string(),
  data: z.record(z.string(), z.any()),
  ingresoId: z.number().optional(),
  despachoId: z.number().optional(),
})

export async function GET() {
  const rotulos = await prisma.rotulo.findMany({
    orderBy: { createdAt: 'desc' },
    include: { ingreso: true, despacho: true },
  })
  const parsed = rotulos.map((r) => ({ ...r, data: JSON.parse(r.data) }))
  return NextResponse.json(parsed)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const rotulo = await prisma.rotulo.create({
    data: {
      tipo: parsed.data.tipo,
      data: JSON.stringify(parsed.data.data),
      ingresoId: parsed.data.ingresoId,
      despachoId: parsed.data.despachoId,
    },
  })
  return NextResponse.json({ ...rotulo, data: JSON.parse(rotulo.data) }, { status: 201 })
}
