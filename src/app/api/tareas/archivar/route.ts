import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'

const schema = z.object({
  ids: z.array(z.number().int()).optional(),
  todasCompletadas: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const role = getRoleFromRequest(req)
  if (role !== 'supervisor') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const { ids, todasCompletadas } = parsed.data
  const where = todasCompletadas
    ? { archivadaAt: null, completadaAt: { not: null } }
    : { archivadaAt: null, id: { in: ids ?? [] } }

  const result = await prisma.tarea.updateMany({
    where,
    data: { archivadaAt: new Date() },
  })
  return NextResponse.json({ count: result.count })
}
