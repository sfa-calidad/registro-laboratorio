import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'
import { conManejoDeErrores } from '@/lib/api'

// De a muchos: cargar 187 mínimos de a uno, abriendo y cerrando el formulario,
// no lo hace nadie — y sin mínimos la alerta solo puede saltar en cero.
const schema = z.object({
  minimos: z
    .array(
      z.object({
        insumoId: z.number().int().positive(),
        // null borra el mínimo y deja el insumo sin aviso hasta llegar a cero.
        stockMinimo: z.number().nonnegative().nullable(),
      }),
    )
    .min(1),
})

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Fijar un mínimo es una decisión de política de compras, no del día a día:
  // va con el resto de la edición de insumos.
  if (getRoleFromRequest(req) !== 'supervisor') {
    return NextResponse.json({ error: 'Solo el supervisor puede fijar los mínimos' }, { status: 403 })
  }
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  return conManejoDeErrores(async () => {
    await prisma.$transaction(
      parsed.data.minimos.map((m) =>
        prisma.insumo.update({
          where: { id: m.insumoId },
          data: { stockMinimo: m.stockMinimo },
        }),
      ),
    )

    return NextResponse.json({ guardados: parsed.data.minimos.length })
  })
}
