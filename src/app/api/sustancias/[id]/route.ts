import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'
import { parseId } from '@/lib/utils'
import { conManejoDeErrores } from '@/lib/api'

const schema = z.object({
  nombre: z.string().min(1).optional(),
  unidad: z.enum(['L', 'kg']).optional(),
})

// La unidad de la planilla venía en blanco en 10 de las 14 filas y se dedujo al
// importar: por eso se puede corregir.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (getRoleFromRequest(req) !== 'supervisor') {
    return NextResponse.json({ error: 'Solo el supervisor puede gestionar sustancias' }, { status: 403 })
  }
  const { id } = await params
  const idNum = parseId(id)
  if (idNum === null) return NextResponse.json({ error: 'Id inválido' }, { status: 400 })

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const d = parsed.data

  return conManejoDeErrores(async () => {
    // Cambiar la unidad de una sustancia que ya tiene insumos colgando cambiaría
    // en silencio lo que dicen las declaraciones: se pide desenlazarlos primero.
    if (d.unidad) {
      const enlazados = await prisma.insumo.count({
        where: { sustanciaId: idNum, unidadContenido: { not: d.unidad } },
      })
      if (enlazados > 0) {
        return NextResponse.json(
          {
            error: `Hay ${enlazados} insumo(s) enlazados medidos en otra unidad. Desenlazalos antes de cambiarla.`,
          },
          { status: 409 },
        )
      }
    }

    const sustancia = await prisma.sustanciaControlada.update({
      where: { id: idNum },
      data: {
        ...(d.nombre !== undefined && { nombre: d.nombre.trim() }),
        ...(d.unidad !== undefined && { unidad: d.unidad }),
      },
    })
    return NextResponse.json(sustancia)
  })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (getRoleFromRequest(req) !== 'supervisor') {
    return NextResponse.json({ error: 'Solo el supervisor puede gestionar sustancias' }, { status: 403 })
  }
  const { id } = await params
  const idNum = parseId(id)
  if (idNum === null) return NextResponse.json({ error: 'Id inválido' }, { status: 400 })
  return conManejoDeErrores(async () => {
    await prisma.sustanciaControlada.update({ where: { id: idNum }, data: { activo: false } })
    return NextResponse.json({ ok: true })
  })
}
