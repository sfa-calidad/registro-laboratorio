import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'

const schema = z.object({
  texto: z.string().min(1).max(500),
})

export async function GET(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const notas = await prisma.notaTablero.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(notas)
}

export async function POST(req: NextRequest) {
  const role = getRoleFromRequest(req)
  if (!role) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const nota = await prisma.notaTablero.create({
    data: { texto: parsed.data.texto, autor: role },
  })
  return NextResponse.json(nota, { status: 201 })
}
