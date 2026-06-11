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
  return NextResponse.json(rotulos)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const rotulo = await prisma.rotulo.create({ data: parsed.data })
  return NextResponse.json(rotulo, { status: 201 })
}
