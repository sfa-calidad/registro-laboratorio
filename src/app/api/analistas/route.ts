import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const schema = z.object({
  nombre: z.string().min(1),
  apellido: z.string().min(1),
})

export async function GET(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const all = req.nextUrl.searchParams.get('all') === 'true'
  const analistas = await prisma.analista.findMany({
    where: all ? undefined : { activo: true },
    orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
  })
  return NextResponse.json(analistas)
}

export async function POST(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const analista = await prisma.analista.create({ data: parsed.data })
  return NextResponse.json(analista, { status: 201 })
}
