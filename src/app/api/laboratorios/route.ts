import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'

const schema = z.object({
  nombre: z.string().min(1),
  esExterno: z.boolean().optional(),
  delExterior: z.boolean().optional(),
})

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const all = req.nextUrl.searchParams.get('all') === 'true'
  const laboratorios = await prisma.laboratorio.findMany({
    where: all ? undefined : { activo: true },
    orderBy: { nombre: 'asc' },
  })
  return NextResponse.json(laboratorios)
}

export async function POST(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const nombre = parsed.data.nombre.trim()
  const existente = await prisma.laboratorio.findFirst({
    where: { nombre: { equals: nombre, mode: 'insensitive' } },
  })
  if (existente) return NextResponse.json(existente, { status: 200 })

  const laboratorio = await prisma.laboratorio.create({
    data: {
      nombre,
      esExterno: parsed.data.esExterno ?? true,
      delExterior: parsed.data.delExterior ?? false,
    },
  })
  return NextResponse.json(laboratorio, { status: 201 })
}
