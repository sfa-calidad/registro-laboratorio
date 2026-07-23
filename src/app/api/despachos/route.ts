import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'

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
  operador: z.string().optional(),
})

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  // fecha desc con id desc como desempate estable: los más nuevos arriba y,
  // ante misma fecha, un orden fijo para que editar un registro no lo reordene.
  const despachos = await prisma.despacho.findMany({ orderBy: [{ fecha: 'desc' }, { id: 'desc' }] })
  return NextResponse.json(despachos)
}

export async function POST(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
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
      operador: parsed.data.operador || null,
    },
  })
  return NextResponse.json(despacho, { status: 201 })
}
