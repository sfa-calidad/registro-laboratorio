import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'

const schema = z.object({
  producto: z.string().min(1),
  parametroId: z.number().int(),
  min: z.number().nullable().optional(),
  max: z.number().nullable().optional(),
})

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const especificaciones = await prisma.especificacion.findMany({
    include: { parametro: true },
    orderBy: [{ producto: 'asc' }, { id: 'asc' }],
  })
  return NextResponse.json(especificaciones)
}

export async function POST(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const { producto, parametroId, min, max } = parsed.data
  if (min == null && max == null) {
    return NextResponse.json({ error: 'Cargá al menos un límite (mín o máx)' }, { status: 400 })
  }
  const espec = await prisma.especificacion.upsert({
    where: { producto_parametroId: { producto, parametroId } },
    update: { min: min ?? null, max: max ?? null },
    create: { producto, parametroId, min: min ?? null, max: max ?? null },
    include: { parametro: true },
  })
  return NextResponse.json(espec, { status: 201 })
}
