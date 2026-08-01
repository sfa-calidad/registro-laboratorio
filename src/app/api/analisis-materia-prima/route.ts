import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'

const resultadoSchema = z.object({
  parametroId: z.number().int(),
  valor: z.number().nullable().optional(),
  valorTexto: z.string().max(120).nullable().optional(),
})

const schema = z.object({
  ingresoId: z.number().int().positive(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha va como AAAA-MM-DD'),
  producto: z.string().min(1).max(120),
  cisternas: z.string().max(60).optional(),
  ordenCompra: z.string().max(60).optional(),
  analista: z.string().max(120).optional(),
  comentario: z.string().max(2000).optional(),
  resultados: z.array(resultadoSchema).max(60).optional(),
})

export const dynamic = 'force-dynamic'

const incluir = { resultados: { include: { parametro: true } }, ingreso: true }

export async function GET(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const analisis = await prisma.analisisMateriaPrima.findMany({
    include: incluir,
    orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
  })
  return NextResponse.json(analisis)
}

export async function POST(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const { resultados, ingresoId, ...datos } = parsed.data
  try {
    const analisis = await prisma.analisisMateriaPrima.create({
      data: {
        ingresoId,
        fecha: new Date(datos.fecha),
        producto: datos.producto,
        cisternas: datos.cisternas || null,
        ordenCompra: datos.ordenCompra || null,
        analista: datos.analista || null,
        comentario: datos.comentario || null,
        resultados: {
          create: (resultados ?? [])
            .filter((r) => r.valor != null || r.valorTexto)
            .map((r) => ({ parametroId: r.parametroId, valor: r.valor ?? null, valorTexto: r.valorTexto || null })),
        },
      },
      include: incluir,
    })
    // El ingreso queda marcado con la fecha del análisis: el campo estaba en el
    // esquema sin usarse desde el principio.
    await prisma.ingreso.update({ where: { id: ingresoId }, data: { fechaAnalisis: new Date(datos.fecha) } })
    return NextResponse.json(analisis, { status: 201 })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      // Un ingreso tiene un solo análisis: si ya existe hay que editarlo.
      if (e.code === 'P2002') {
        return NextResponse.json({ error: 'Este ingreso ya tiene un análisis cargado' }, { status: 409 })
      }
      if (e.code === 'P2003' || e.code === 'P2025') {
        return NextResponse.json({ error: 'No se encontró el ingreso' }, { status: 404 })
      }
    }
    throw e
  }
}
