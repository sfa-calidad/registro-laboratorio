import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'

const schema = z.object({
  producto: z.string().min(1),
  parametroId: z.number().int(),
  orden: z.number().int().optional(),
  // TANQUE: el control de tanque. MATERIA_PRIMA: el camión que entra.
  contexto: z.enum(['TANQUE', 'MATERIA_PRIMA']).optional(),
})

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const perfiles = await prisma.perfilProducto.findMany({
    include: { parametro: true },
    orderBy: [{ contexto: 'asc' }, { producto: 'asc' }, { orden: 'asc' }],
  })
  return NextResponse.json(perfiles)
}

export async function POST(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const { producto, parametroId } = parsed.data
  const contexto = parsed.data.contexto ?? 'TANQUE'
  // Si no mandan orden, va al final del perfil de ese producto.
  const max = await prisma.perfilProducto.aggregate({ where: { producto, contexto }, _max: { orden: true } })
  const perfil = await prisma.perfilProducto.upsert({
    where: { producto_parametroId_contexto: { producto, parametroId, contexto } },
    update: parsed.data.orden !== undefined ? { orden: parsed.data.orden } : {},
    create: { producto, parametroId, contexto, orden: parsed.data.orden ?? (max._max.orden ?? 0) + 1 },
    include: { parametro: true },
  })
  return NextResponse.json(perfil, { status: 201 })
}
