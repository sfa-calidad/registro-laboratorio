import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'
import { conManejoDeErrores } from '@/lib/api'

const schema = z.object({
  nombre: z.string().min(1),
  // El GTIN es el código con el que la sustancia se declara: es su identidad,
  // más que el nombre. Solo dígitos.
  gtin: z.string().regex(/^\d{8,14}$/, 'El GTIN son entre 8 y 14 dígitos'),
  unidad: z.enum(['L', 'kg']),
})

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const sustancias = await prisma.sustanciaControlada.findMany({
    where: { activo: true },
    orderBy: { nombre: 'asc' },
  })
  return NextResponse.json(sustancias)
}

export async function POST(req: NextRequest) {
  if (getRoleFromRequest(req) !== 'supervisor') {
    return NextResponse.json({ error: 'Solo el supervisor puede gestionar sustancias' }, { status: 403 })
  }
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' }, { status: 400 })
  }
  const d = parsed.data

  return conManejoDeErrores(async () => {
    const sustancia = await prisma.sustanciaControlada.create({
      data: { nombre: d.nombre.trim(), gtin: d.gtin, unidad: d.unidad },
    })
    return NextResponse.json(sustancia, { status: 201 })
  })
}
