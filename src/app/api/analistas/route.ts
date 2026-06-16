import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  nombre: z.string().min(1),
  apellido: z.string().min(1),
})

export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get('all') === 'true'
  const analistas = await prisma.analista.findMany({
    where: all ? undefined : { activo: true },
    orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
  })
  return NextResponse.json(analistas)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const analista = await prisma.analista.create({ data: parsed.data })
  return NextResponse.json(analista, { status: 201 })
}
