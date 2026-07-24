import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'

const schema = z.object({
  columnaId: z.number().int(),
  ids: z.array(z.number().int()),
  // Solo se envía cuando la tarjeta movida cambió de columna (para marcar o
  // limpiar completadaAt según entre o salga de la columna "Completado").
  movedId: z.number().int().optional(),
  completadaAt: z.string().datetime().nullable().optional(),
})

export async function POST(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const { columnaId, ids, movedId, completadaAt } = parsed.data

  // Reasigna columna y orden de toda la columna destino en una transacción,
  // y ajusta completadaAt de la tarjeta movida si corresponde.
  await prisma.$transaction([
    ...ids.map((id, index) =>
      prisma.tarea.update({ where: { id }, data: { columnaId, orden: index } })
    ),
    ...(movedId !== undefined
      ? [prisma.tarea.update({ where: { id: movedId }, data: { completadaAt: completadaAt ? new Date(completadaAt) : null } })]
      : []),
  ])

  return NextResponse.json({ ok: true })
}
