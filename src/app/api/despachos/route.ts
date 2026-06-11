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
})

export async function GET() {
  const despachos = await prisma.despacho.findMany({ orderBy: { fecha: 'desc' } })
  return NextResponse.json(despachos)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const despacho = await prisma.despacho.create({
    data: {
      ...parsed.data,
      fecha: new Date(parsed.data.fecha),
      deposito: parsed.data.deposito || null,
      observacion: parsed.data.observacion || null,
      precintSFA: parsed.data.precintSFA || null,
      precintAduana: parsed.data.precintAduana || null,
    },
  })
  return NextResponse.json(despacho, { status: 201 })
}
