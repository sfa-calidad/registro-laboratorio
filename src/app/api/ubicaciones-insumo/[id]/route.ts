import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRoleFromRequest } from '@/lib/auth'
import { parseId } from '@/lib/utils'
import { conManejoDeErrores } from '@/lib/api'

// Baja lógica: los insumos guardan el nombre de la ubicación como texto, así que
// desactivarla la saca de los desplegables sin mover nada de lo ya cargado.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (getRoleFromRequest(req) !== 'supervisor') {
    return NextResponse.json({ error: 'Solo el supervisor puede gestionar ubicaciones' }, { status: 403 })
  }
  const { id } = await params
  const idNum = parseId(id)
  if (idNum === null) return NextResponse.json({ error: 'Id inválido' }, { status: 400 })
  return conManejoDeErrores(async () => {
    await prisma.ubicacionInsumo.update({ where: { id: idNum }, data: { activo: false } })
    return NextResponse.json({ ok: true })
  })
}
