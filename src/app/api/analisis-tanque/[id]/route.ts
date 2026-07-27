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
  alturaM: z.number().nullable().optional(),
  referencia: z.enum(['AF', 'DS', 'AC']).nullable().optional(),
  conjuntoHaciaArriba: z.boolean().optional(),
  analista: z.string().optional(),
  comentario: z.string().optional(),
  resultados: z.array(resultadoSchema).optional(),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const { resultados, ...datos } = parsed.data
  // Los resultados se reemplazan completos: es una carga chica y evita
  // diferenciar altas, bajas y modificaciones una por una.
  const analisis = await prisma.analisisTanque.update({
    where: { id: Number(id) },
    data: {
      ...datos,
      fecha: new Date(datos.fecha),
      alturaM: datos.alturaM ?? null,
      referencia: datos.referencia ?? null,
      conjuntoHaciaArriba: datos.conjuntoHaciaArriba ?? false,
      analista: datos.analista || null,
      comentario: datos.comentario || null,
      resultados: {
        deleteMany: {},
        create: (resultados ?? [])
          .filter((r) => r.valor != null || r.valorTexto)
          .map((r) => ({ parametroId: r.parametroId, valor: r.valor ?? null, valorTexto: r.valorTexto || null })),
      },
    },
    include: { resultados: { include: { parametro: true } } },
  })
  return NextResponse.json(analisis)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  // Los resultados caen solos por el onDelete: Cascade de la relación.
  await prisma.analisisTanque.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
