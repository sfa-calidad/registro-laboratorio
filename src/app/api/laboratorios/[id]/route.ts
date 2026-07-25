import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRoleFromRequest } from '@/lib/auth'

// Baja lógica: las muestras históricas guardan el nombre del laboratorio.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  await prisma.laboratorio.update({ where: { id: Number(id) }, data: { activo: false } })
  return NextResponse.json({ ok: true })
}
