import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'
import { conManejoDeErrores } from '@/lib/api'
import { hoyEnLaboratorio } from '@/lib/utils'
import { validarSustancia } from '@/lib/sustanciaDeInsumo'

const schema = z.object({
  nombre: z.string().min(1),
  categoria: z.enum(['REACTIVO', 'VIDRIO']),
  presentacion: z.string().optional(),
  ubicacion: z.string().optional(),
  // Stock inicial: no se guarda como campo suelto, se asienta como entrada.
  stock: z.number().nonnegative().optional(),
  stockMinimo: z.number().nonnegative().nullable().optional(),
  seControla: z.boolean().optional(),
  contenidoPorEnvase: z.number().positive().nullable().optional(),
  unidadContenido: z.enum(['L', 'kg']).nullable().optional(),
  sustanciaId: z.number().int().positive().nullable().optional(),
  observacion: z.string().optional(),
})

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const insumos = await prisma.insumo.findMany({
    where: { activo: true },
    orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
  })
  return NextResponse.json(insumos)
}

export async function POST(req: NextRequest) {
  // Dar de alta un insumo cambia el catálogo, no el día a día: como los
  // contactos y los analistas, lo hace el supervisor.
  if (getRoleFromRequest(req) !== 'supervisor') {
    return NextResponse.json({ error: 'Solo el supervisor puede dar de alta insumos' }, { status: 403 })
  }
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const d = parsed.data

  return conManejoDeErrores(async () => {
    const problema = await validarSustancia(d.sustanciaId ?? null, d.unidadContenido ?? null)
    if (problema) return NextResponse.json({ error: problema }, { status: 400 })

    const stockInicial = d.stock ?? 0

    const insumo = await prisma.$transaction(async (tx) => {
      const creado = await tx.insumo.create({
        data: {
          nombre: d.nombre.trim(),
          categoria: d.categoria,
          presentacion: d.presentacion?.trim() || '',
          ubicacion: d.ubicacion?.trim() || null,
          stock: stockInicial,
          stockMinimo: d.stockMinimo ?? null,
          seControla: d.seControla ?? true,
          contenidoPorEnvase: d.contenidoPorEnvase ?? null,
          unidadContenido: d.unidadContenido ?? null,
          sustanciaId: d.sustanciaId ?? null,
          observacion: d.observacion?.trim() || null,
        },
      })
      // Hasta el primer número tiene que poder explicarse: sin este asiento, el
      // stock inicial sería el único dato del inventario sin origen.
      if (stockInicial !== 0) {
        await tx.movimientoInsumo.create({
          data: {
            insumoId: creado.id,
            tipo: 'ENTRADA',
            cantidad: stockInicial,
            stockPrevio: 0,
            stockNuevo: stockInicial,
            motivo: 'Stock inicial al dar de alta el insumo',
            fecha: hoyEnLaboratorio(),
          },
        })
      }
      return creado
    })

    return NextResponse.json(insumo, { status: 201 })
  })
}
