import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

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

export const dynamic = 'force-dynamic'

export async function GET() {
  const ingresos = await prisma.ingreso.findMany({ orderBy: { fecha: 'desc' } })
  return NextResponse.json(ingresos)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const ingreso = await prisma.ingreso.create({
    data: {
      ...parsed.data,
      fecha: new Date(parsed.data.fecha),
      producto2: parsed.data.producto2 || null,
      observacion: parsed.data.observacion || null,
      precinto: parsed.data.precinto || null,
      operador: parsed.data.operador || null,
    },
  })
  return NextResponse.json(ingreso, { status: 201 })
}
