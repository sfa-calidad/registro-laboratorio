import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'

const resultadoSchema = z.object({
  parametroId: z.number().int(),
  valor: z.number().nullable().optional(),
  valorTexto: z.string().nullable().optional(),
})

const schema = z.object({
  fecha: z.string(),
  producto: z.string().min(1),
  tanques: z.string().min(1),
  punto: z.string().optional(),
  alturaM: z.number().nullable().optional(),
  referencia: z.enum(['AF', 'DS', 'AC']).nullable().optional(),
  conjuntoHaciaArriba: z.boolean().optional(),
  analista: z.string().optional(),
  comentario: z.string().optional(),
  resultados: z.array(resultadoSchema).optional(),
})

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const analisis = await prisma.analisisTanque.findMany({
    include: { resultados: { include: { parametro: true } } },
    orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
  })
  return NextResponse.json(analisis)
}

export async function POST(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const { resultados, ...datos } = parsed.data
  const analisis = await prisma.analisisTanque.create({
    data: {
      ...datos,
      fecha: new Date(datos.fecha),
      punto: datos.punto || null,
      alturaM: datos.alturaM ?? null,
      referencia: datos.referencia ?? null,
      conjuntoHaciaArriba: datos.conjuntoHaciaArriba ?? false,
      analista: datos.analista || null,
      comentario: datos.comentario || null,
      resultados: {
        create: (resultados ?? [])
          .filter((r) => r.valor != null || r.valorTexto)
          .map((r) => ({ parametroId: r.parametroId, valor: r.valor ?? null, valorTexto: r.valorTexto || null })),
      },
    },
    include: { resultados: { include: { parametro: true } } },
  })
  return NextResponse.json(analisis, { status: 201 })
}
