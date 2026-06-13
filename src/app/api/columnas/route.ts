import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({ nombre: z.string().min(1), orden: z.number().int() })

export async function GET() {
  const columnas = await prisma.columnaKanban.findMany({ orderBy: { orden: 'asc' } })
  return NextResponse.json(columnas)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const col = await prisma.columnaKanban.create({ data: parsed.data })
  return NextResponse.json(col, { status: 201 })
}
