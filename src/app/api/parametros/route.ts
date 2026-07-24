import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'

const schema = z.object({
  nombre: z.string().min(1),
  metodo: z.string().optional(),
  abreviatura: z.string().optional(),
  unidad: z.string().optional(),
  decimales: z.number().int().min(0).max(6).optional(),
  orden: z.number().int().optional(),
})

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const all = req.nextUrl.searchParams.get('all') === 'true'
  const parametros = await prisma.parametro.findMany({
    where: all ? undefined : { activo: true },
    orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
  })
  return NextResponse.json(parametros)
}

export async function POST(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const { nombre, metodo } = parsed.data
  const existente = await prisma.parametro.findFirst({
    where: { nombre: { equals: nombre.trim(), mode: 'insensitive' }, metodo: metodo?.trim() || null },
  })
  if (existente) return NextResponse.json(existente, { status: 200 })

  const parametro = await prisma.parametro.create({
    data: {
      nombre: nombre.trim(),
      metodo: metodo?.trim() || null,
      abreviatura: parsed.data.abreviatura?.trim() || null,
      unidad: parsed.data.unidad?.trim() || null,
      decimales: parsed.data.decimales ?? 2,
      orden: parsed.data.orden ?? 0,
    },
  })
  return NextResponse.json(parametro, { status: 201 })
}
