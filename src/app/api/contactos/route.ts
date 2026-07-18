import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'

const schema = z.object({
  nombre: z.string().min(1),
})

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const contactos = await prisma.contacto.findMany({ orderBy: { nombre: 'asc' } })
  return NextResponse.json(contactos)
}

export async function POST(req: NextRequest) {
  if (getRoleFromRequest(req) !== 'supervisor') return NextResponse.json({ error: 'Solo el supervisor puede gestionar contactos' }, { status: 403 })
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const nombre = parsed.data.nombre.trim()
  const existente = await prisma.contacto.findFirst({
    where: { nombre: { equals: nombre, mode: 'insensitive' } },
  })
  if (existente) return NextResponse.json(existente, { status: 200 })

  const contacto = await prisma.contacto.create({ data: { nombre } })
  return NextResponse.json(contacto, { status: 201 })
}
