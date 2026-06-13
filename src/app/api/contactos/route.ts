import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  nombre: z.string().min(1),
  tipo: z.enum(['proveedor', 'cliente']),
})

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo')
  const where = tipo ? { tipo } : {}
  const contactos = await prisma.contacto.findMany({ where, orderBy: { nombre: 'asc' } })
  return NextResponse.json(contactos)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const contacto = await prisma.contacto.create({ data: parsed.data })
  return NextResponse.json(contacto, { status: 201 })
}
