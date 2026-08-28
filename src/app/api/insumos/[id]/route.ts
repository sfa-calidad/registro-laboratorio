import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'
import { parseId } from '@/lib/utils'
import { conManejoDeErrores } from '@/lib/api'
import { validarSustancia } from '@/lib/sustanciaDeInsumo'

// El stock no está en el esquema a propósito: se mueve con un movimiento, que
// deja quién, cuándo y por qué. Editarlo acá sería volver a la planilla.
const schema = z.object({
  nombre: z.string().min(1).optional(),
  categoria: z.enum(['REACTIVO', 'VIDRIO']).optional(),
  presentacion: z.string().optional(),
  ubicacion: z.string().nullable().optional(),
  stockMinimo: z.number().nonnegative().nullable().optional(),
  seControla: z.boolean().optional(),
  contenidoPorEnvase: z.number().positive().nullable().optional(),
  unidadContenido: z.enum(['L', 'kg']).nullable().optional(),
  sustanciaId: z.number().int().positive().nullable().optional(),
  observacion: z.string().nullable().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (getRoleFromRequest(req) !== 'supervisor') {
    return NextResponse.json({ error: 'Solo el supervisor puede editar insumos' }, { status: 403 })
  }
  const { id } = await params
  const idNum = parseId(id)
  if (idNum === null) return NextResponse.json({ error: 'Id inválido' }, { status: 400 })

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const d = parsed.data

  return conManejoDeErrores(async () => {
    // Se valida sobre cómo queda el insumo, no sobre lo que trae el pedido: si
    // solo se cambia la unidad y la sustancia ya estaba enlazada de antes, el
    // par también tiene que seguir siendo compatible.
    const actual = await prisma.insumo.findUnique({ where: { id: idNum } })
    if (!actual) return NextResponse.json({ error: 'No se encontró el registro' }, { status: 404 })

    const sustanciaId = d.sustanciaId !== undefined ? d.sustanciaId : actual.sustanciaId
    const unidad = d.unidadContenido !== undefined ? d.unidadContenido : actual.unidadContenido
    const problema = await validarSustancia(sustanciaId, unidad)
    if (problema) return NextResponse.json({ error: problema }, { status: 400 })

    const insumo = await prisma.insumo.update({
      where: { id: idNum },
      data: {
        ...(d.nombre !== undefined && { nombre: d.nombre.trim() }),
        ...(d.categoria !== undefined && { categoria: d.categoria }),
        ...(d.presentacion !== undefined && { presentacion: d.presentacion.trim() }),
        ...(d.ubicacion !== undefined && { ubicacion: d.ubicacion?.trim() || null }),
        ...(d.stockMinimo !== undefined && { stockMinimo: d.stockMinimo }),
        ...(d.seControla !== undefined && { seControla: d.seControla }),
        ...(d.contenidoPorEnvase !== undefined && { contenidoPorEnvase: d.contenidoPorEnvase }),
        ...(d.unidadContenido !== undefined && { unidadContenido: d.unidadContenido }),
        ...(d.sustanciaId !== undefined && { sustanciaId: d.sustanciaId }),
        ...(d.observacion !== undefined && { observacion: d.observacion?.trim() || null }),
      },
    })
    return NextResponse.json(insumo)
  })
}

// Baja lógica: los movimientos ya registrados siguen contando para la
// declaración del período aunque el insumo se deje de usar.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (getRoleFromRequest(req) !== 'supervisor') {
    return NextResponse.json({ error: 'Solo el supervisor puede dar de baja insumos' }, { status: 403 })
  }
  const { id } = await params
  const idNum = parseId(id)
  if (idNum === null) return NextResponse.json({ error: 'Id inválido' }, { status: 400 })
  return conManejoDeErrores(async () => {
    await prisma.insumo.update({ where: { id: idNum }, data: { activo: false } })
    return NextResponse.json({ ok: true })
  })
}
