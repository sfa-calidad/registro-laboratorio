import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'
import { parseId } from '@/lib/utils'
import { conManejoDeErrores } from '@/lib/api'
import { marcarFechaAnalisis } from '../route'

const resultadoSchema = z.object({
  parametroId: z.number().int(),
  valor: z.number().nullable().optional(),
  valorTexto: z.string().max(120).nullable().optional(),
  // El límite lo escribe quien carga el análisis: viene de la planilla de
  // coordinación de esa orden de compra, no del catálogo.
  specMin: z.number().nullable().optional(),
  specMax: z.number().nullable().optional(),
})

const schema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha va como AAAA-MM-DD'),
  producto: z.string().min(1).max(120),
  cisternas: z.string().max(60).optional(),
  ordenCompra: z.string().max(60).optional(),
  analista: z.string().max(120).optional(),
  comentario: z.string().max(2000).optional(),
  resultados: z.array(resultadoSchema).max(60).optional(),
})

const incluir = { resultados: { include: { parametro: true } }, ingreso: true }

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const idNum = parseId(id)
  if (idNum === null) return NextResponse.json({ error: 'Id inválido' }, { status: 400 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const { resultados, ...datos } = parsed.data
  return conManejoDeErrores(async () => {
    const analisis = await prisma.analisisMateriaPrima.update({
      where: { id: idNum },
      data: {
        fecha: new Date(datos.fecha),
        producto: datos.producto,
        cisternas: datos.cisternas || null,
        ordenCompra: datos.ordenCompra || null,
        analista: datos.analista || null,
        comentario: datos.comentario || null,
        // Los resultados se reemplazan completos, igual que en tanques.
        resultados: {
          deleteMany: {},
          create: (resultados ?? [])
            .filter((r) => r.valor != null || r.valorTexto || r.specMin != null || r.specMax != null)
            .map((r) => ({
              parametroId: r.parametroId,
              valor: r.valor ?? null,
              valorTexto: r.valorTexto || null,
              specMin: r.specMin ?? null,
              specMax: r.specMax ?? null,
            })),
        },
      },
      include: incluir,
    })
    await marcarFechaAnalisis(analisis.ingresoId)
    return NextResponse.json(analisis)
  })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const idNum = parseId(id)
  if (idNum === null) return NextResponse.json({ error: 'Id inválido' }, { status: 400 })
  return conManejoDeErrores(async () => {
    const analisis = await prisma.analisisMateriaPrima.delete({ where: { id: idNum } })
    // Con dos productos puede quedar el otro análisis: la fecha se recalcula
    // sobre lo que sobrevive, y queda en null solo si no queda ninguno.
    await marcarFechaAnalisis(analisis.ingresoId)
    return NextResponse.json({ ok: true })
  })
}
