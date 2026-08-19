import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'
import { esProductoDelIngreso, productosDelIngreso } from '@/lib/materiaPrima'

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

// El ingreso queda marcado con la fecha del análisis más reciente que tenga: con
// dos productos hay dos análisis y puede haberse cargado uno mucho después.
export async function marcarFechaAnalisis(ingresoId: number) {
  const ultimo = await prisma.analisisMateriaPrima.aggregate({
    where: { ingresoId },
    _max: { fecha: true },
  })
  await prisma.ingreso.update({ where: { id: ingresoId }, data: { fechaAnalisis: ultimo._max.fecha } })
}

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

  // El producto tiene que ser uno de los del ingreso: el análisis se informa a
  // nombre del camión, no de un producto suelto. Un camión de borra con
  // sobrenadante de aceite lleva los dos, uno en cada campo.
  const ingreso = await prisma.ingreso.findUnique({ where: { id: ingresoId } })
  if (!ingreso) return NextResponse.json({ error: 'No se encontró el ingreso' }, { status: 404 })
  if (!esProductoDelIngreso(datos.producto, ingreso)) {
    return NextResponse.json(
      { error: `El ingreso no trae ${datos.producto}: sus productos son ${productosDelIngreso(ingreso).join(' y ')}` },
      { status: 400 }
    )
  }

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
    await marcarFechaAnalisis(ingresoId)
    return NextResponse.json(analisis, { status: 201 })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      // Un análisis por producto del ingreso: si ya existe hay que editarlo.
      if (e.code === 'P2002') {
        return NextResponse.json(
          { error: `Este ingreso ya tiene un análisis cargado de ${datos.producto}` },
          { status: 409 }
        )
      }
      if (e.code === 'P2003' || e.code === 'P2025') {
        return NextResponse.json({ error: 'No se encontró el ingreso' }, { status: 404 })
      }
    }
    throw e
  }
}
